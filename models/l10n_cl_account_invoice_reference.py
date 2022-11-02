from odoo import fields, models


class AccountInvoiceReference(models.Model):
    _inherit = 'l10n_cl.account.invoice.reference'

    order_id = fields.Many2one('pos.order', string='Order')
    