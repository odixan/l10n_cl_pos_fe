# -*- coding: utf-8 -*-
{
    "name": "POS - Facturación Electrónica",
    "summary": """
        Emisión de Boletas desde el POS""",
    "description": """
        Emisión de Boletas desde el POS
    """,
    "author": "",
    "website": "",
    "contribuitors": "Frank Quatromani <frank.quatromani@gmail.com>",
    "category": "Sale/Point of Sale",
    "version": "0.1",
    "license": "OPL-1",
    "depends": [
        "point_of_sale",
        "l10n_cl",
        "l10n_cl_edi_boletas",
        "l10n_latam_invoice_document",
    ],
    "data": [
        "views/pos_config_views.xml",
        "views/pos_order_views.xml",
        "views/pos_session_views.xml",
    ],
    "assets": {
        "point_of_sale.assets": [
            "/l10n_cl_pos_fe/static/src/**/*.js",
            "/l10n_cl_pos_fe/static/src/**/*.less",
        ],
        "web.assets_qweb": [
            "l10n_cl_pos_fe/static/src/xml/ClientScreen.xml",
            "l10n_cl_pos_fe/static/src/xml/OrderReceipt.xml",
            "l10n_cl_pos_fe/static/src/xml/PaymentScreen.xml",
            "l10n_cl_pos_fe/static/src/xml/SaleDetailsReport.xml",
        ],
    },
    "installable": True,
    "auto_install": False,
    "demo": [],
    "test": [],
}
