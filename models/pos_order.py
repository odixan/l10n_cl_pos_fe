# -*- coding: utf-8 -*-

from odoo import models, fields, api, tools, _
from odoo.exceptions import UserError
from datetime import datetime
from functools import partial
from odoo.tools.float_utils import float_repr, float_round
from html import unescape
from io import BytesIO
from lxml import etree
import base64
import logging
import json
import re
import psycopg2
import pytz


_logger = logging.getLogger(__name__)

try:
    import pdf417gen
except ImportError:
    pdf417gen = None
    _logger.error('Could not import library pdf417gen')

class PosOrder(models.Model):
    _name = 'pos.order'
    _inherit = ['pos.order', 'mail.thread', 'mail.activity.mixin']

    l10n_latam_document_number = fields.Char(string="Folio Boleta")
    l10n_latam_document_number_inv = fields.Char(string="Folio Factura")
    l10n_latam_document_type_id = fields.Many2one('l10n_latam.document.type',
        string='Tipo de Documento',
        readonly=True,
        copy=True,
    )
    signature = fields.Char(
        string="Firma",
    )
    l10n_latam_document_type_id_code = fields.Char(related='l10n_latam_document_type_id.code', string='Codigo de Documento')

    to_ticket = fields.Boolean('To Ticket')

    # def get_document_number(self):
    #     return int(self.l10n_latam_document_number)
    #
    @api.model
    def _order_fields(self, ui_order):
        process_line = partial(self.env['pos.order.line']._order_line_fields, session_id=ui_order['pos_session_id'])
        return {
            'user_id':      ui_order['user_id'] or False,
            'session_id':   ui_order['pos_session_id'],
            'lines':        [process_line(l) for l in ui_order['lines']] if ui_order['lines'] else False,
            'pos_reference': ui_order['name'],
            'sequence_number': ui_order['sequence_number'],
            'partner_id':   ui_order['partner_id'] or False,
            'date_order':   ui_order['creation_date'].replace('T', ' ')[:19],
            'fiscal_position_id': ui_order['fiscal_position_id'],
            'pricelist_id': ui_order['pricelist_id'],
            'amount_paid':  ui_order['amount_paid'],
            'amount_total':  ui_order['amount_total'],
            'amount_tax':  ui_order['amount_tax'],
            'amount_return':  ui_order['amount_return'],
            'company_id': self.env['pos.session'].browse(ui_order['pos_session_id']).company_id.id,
            'to_invoice': ui_order['to_invoice'] if "to_invoice" in ui_order else False,
            'is_tipped': ui_order.get('is_tipped', False),
            'tip_amount': ui_order.get('tip_amount', 0),
            'to_ticket': ui_order['to_ticket'] if "to_ticket" in ui_order else False,
            'l10n_latam_document_number': ui_order.get('l10n_latam_document_number', 0)
        }


    @api.model
    def _process_order(self, order, draft, existing_order):
        """Create or update an pos.order from a given dictionary.

        :param dict order: dictionary representing the order.
        :param bool draft: Indicate that the pos_order is not validated yet.
        :param existing_order: order to be updated or False.
        :type existing_order: pos.order.
        :returns: id of created/updated pos.order
        :rtype: int
        """
        order = order['data']
        pos_session = self.env['pos.session'].browse(order['pos_session_id'])
        if pos_session.state == 'closing_control' or pos_session.state == 'closed':
            order['pos_session_id'] = self._get_valid_session(order).id

        pos_order = False
        if not existing_order:
            pos_order = self.create(self._order_fields(order))
        else:
            pos_order = existing_order
            pos_order.lines.unlink()
            order['user_id'] = pos_order.user_id.id
            pos_order.write(self._order_fields(order))

        pos_order = pos_order.with_company(pos_order.company_id)
        self = self.with_company(pos_order.company_id)
        self._process_payment_lines(order, pos_order, pos_session, draft)

        if not draft:
            try:
                pos_order.action_pos_order_paid()
            except psycopg2.DatabaseError:
                # do not hide transactional errors, the order(s) won't be saved!
                raise
            except Exception as e:
                _logger.error('Could not fully process the POS Order: %s', tools.ustr(e))
            pos_order._create_order_picking()

        if (pos_order.to_invoice or pos_order.to_ticket) and pos_order.state == 'paid':
            if pos_order.to_invoice:
                pos_order.l10n_latam_document_type_id = self.env['l10n_latam.document.type'].search([('code', '=', '33')]).id
            if pos_order.to_ticket:
                pos_order.l10n_latam_document_type_id = self.env['l10n_latam.document.type'].search([('code', '=', '39')]).id
            pos_order.action_pos_order_invoice()

        return pos_order.id

    def _prepare_invoice_vals(self):
        self.ensure_one()
        timezone = pytz.timezone(self._context.get('tz') or self.env.user.tz or 'UTC')
        vals = {
            'payment_reference': self.name,
            'invoice_origin': self.name,
            'journal_id': self.session_id.config_id.invoice_journal_id.id,
            'l10n_latam_document_type_id': self.l10n_latam_document_type_id.id,
            'move_type': 'out_invoice' if self.amount_total >= 0 else 'out_refund',
            'ref': self.name,
            'partner_id': self.partner_id.id,
            'narration': self.note or '',
            # considering partner's sale pricelist's currency
            'currency_id': self.pricelist_id.currency_id.id,
            'invoice_user_id': self.user_id.id,
            'invoice_date': self.date_order.astimezone(timezone).date(),
            'fiscal_position_id': self.fiscal_position_id.id,
            'invoice_line_ids': [(0, None, self._prepare_invoice_line(line)) for line in self.lines],
            'invoice_cash_rounding_id': self.config_id.rounding_method.id
            if self.config_id.cash_rounding and (not self.config_id.only_round_cash_method or any(p.payment_method_id.is_cash_count for p in self.payment_ids))
            else False
        }
        return vals

    @api.model
    def get_next_ticket_number(self, session):
        folio = False
        last_invoice = self.env['account.move'].search([('l10n_latam_document_type_id_code', '=', 39), ('state', 'not in', [])], order="id desc")
        if last_invoice:
            folio = int(last_invoice[0].l10n_latam_document_number) + 1
        return str(folio)

    @api.model
    def get_next_invoice_number(self):
        folio = False
        last_invoice = self.env['account.move'].search([('l10n_latam_document_type_id_code', '=', 33)], order="id desc")
        if last_invoice:
            folio = int(last_invoice[0].l10n_latam_document_number) + 1
        return str(folio)