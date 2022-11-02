# -*- coding: utf-8 -*-

from odoo import models, fields, api


class PosConfig(models.Model):
    _inherit = "pos.config"

    caf_file_ids = fields.One2many("l10n_cl.dte.caf", "pos_id", string="caf_file_id")

    module_ticket = fields.Boolean(string="Usar Boletas", default=True)
    next_number = fields.Integer("Next Number")
    next_number_exempt = fields.Integer("Next NUmber Exempt")
