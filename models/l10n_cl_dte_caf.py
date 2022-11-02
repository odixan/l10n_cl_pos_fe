# -*- coding: utf-8 -*-

from email.policy import default
from odoo import models, fields, api


class L10nClDteCaf(models.Model):
    _inherit = "l10n_cl.dte.caf"

    pos_id = fields.Many2one("pos.config", string="POS assigned to this cafs file.")
