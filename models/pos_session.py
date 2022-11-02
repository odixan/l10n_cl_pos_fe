# -*- coding: utf-8 -*-
from odoo import fields, models, api, _


class PosSession(models.Model):
    _inherit = "pos.session"

    caf_id = fields.Many2one(
        "pos.config",
        string="Fixed Asset Account",
        compute="_compute_caf_id",
        store=True,
        help="Get active CAF File for this session",
    )

    next_number = fields.Char(compute="get_next_folio", string="Proximo Folio (39)")

    next_number_exempt = fields.Char(compute="get_next_folio", string="Proximo Folio")

    remaining_docs = fields.Integer(compute="get_next_folio", string="Folios restantes (39)")

    remaining_docs_exempt = fields.Integer(string="Folios restantes")

    percent_caf = fields.Float("Percent Ticket", compute="compute_percent_caf")
    percent_caf_exempt = fields.Float("Percent Ticket Exempt")

    def _compute_caf_id(self):
        """Get active CAF File for this session
        Returns:
            ID : CAF File
        """
        for record in self:
            caf_id = record.config_id.caf_file_ids.filtered(lambda caf: caf.status == "in_use")
            return caf_id if caf_id else False

    def get_next_folio(self):
        for session in self:
            remaining_docs = 0
            next_number = "0"
            next_number_exempt = "0"
            if session.state != "closed":
                if session.config_id:
                    caf_pos_id = session.config_id
                    next_number = caf_pos_id.next_number
                    next_number_exempt = caf_pos_id.next_number_exempt
                if session.caf_id:
                    remaining_docs = float(session.caf_id.final_nb) - float(next_number)
            print(remaining_docs, " ", next_number)
            session.remaining_docs = int(remaining_docs)
            session.next_number = next_number
            session.next_number_exempt = next_number_exempt

    @api.depends("remaining_docs")
    def compute_percent_caf(self):
        for session in self:
            percent = 0.00
            if session.state != "closed":
                if session.caf_id:
                    percent = (session.remaining_docs / (session.caf_id.final_nb - session.caf_id.start_nb + 1)) * 100
            session.percent_caf = round(percent, 2)
