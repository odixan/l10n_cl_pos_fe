odoo.define('l10n_cl_pos_fe.models', function (require) {
    "use strict";

    var models = require('point_of_sale.models');
    var modules = models.PosModel.prototype.models;
    var rpc = require('web.rpc');

    var L10N_CL_SII_REGIONAL_OFFICES_ITEMS = {
      'ur_Anc': 'Ancud',
      'ur_Ang': 'Angol',
      'ur_Ant': 'Antofagasta',
      'ur_Ari': 'Arica y Parinacota',
      'ur_Ays': 'Aysén',
      'ur_Cal': 'Calama',
      'ur_Cas': 'Castro',
      'ur_Cau': 'Cauquenes',
      'ur_Cha': 'Chaitén',
      'ur_Chn': 'Chañaral',
      'ur_ChC': 'Chile Chico',
      'ur_Chi': 'Chillán',
      'ur_Coc': 'Cochrane',
      'ur_Cop': 'Concepción ',
      'ur_Cos': 'Constitución',
      'ur_Coo': 'Copiapo',
      'ur_Coq': 'Coquimbo',
      'ur_Coy': 'Coyhaique',
      'ur_Cur': 'Curicó',
      'ur_Ill': 'Illapel',
      'ur_Iqu': 'Iquique',
      'ur_LaF': 'La Florida',
      'ur_LaL': 'La Ligua',
      'ur_LaS': 'La Serena',
      'ur_LaU': 'La Unión',
      'ur_Lan': 'Lanco',
      'ur_Leb': 'Lebu',
      'ur_Lin': 'Linares',
      'ur_Lod': 'Los Andes',
      'ur_Log': 'Los Ángeles',
      'ur_Oso': 'Osorno',
      'ur_Ova': 'Ovalle',
      'ur_Pan': 'Panguipulli',
      'ur_Par': 'Parral',
      'ur_Pic': 'Pichilemu',
      'ur_Por': 'Porvenir',
      'ur_PuM': 'Puerto Montt',
      'ur_PuN': 'Puerto Natales',
      'ur_PuV': 'Puerto Varas',
      'ur_PuA': 'Punta Arenas',
      'ur_Qui': 'Quillota',
      'ur_Ran': 'Rancagua',
      'ur_SaA': 'San Antonio',
      'ur_Sar': 'San Carlos',
      'ur_SaF': 'San Felipe',
      'ur_SaD': 'San Fernando',
      'ur_SaV': 'San Vicente de Tagua Tagua',
      'ur_SaZ': 'Santa Cruz',
      'ur_SaC': 'Santiago Centro',
      'ur_SaN': 'Santiago Norte',
      'ur_SaO': 'Santiago Oriente',
      'ur_SaP': 'Santiago Poniente',
      'ur_SaS': 'Santiago Sur',
      'ur_TaT': 'Tal-Tal',
      'ur_Tac': 'Talca',
      'ur_Tah': 'Talcahuano',
      'ur_Tem': 'Temuco',
      'ur_Toc': 'Tocopilla',
      'ur_Vld': 'Valdivia',
      'ur_Val': 'Vallenar',
      'ur_Vlp': 'Valparaíso',
      'ur_Vic': 'Victoria',
      'ur_ViA': 'Villa Alemana',
      'ur_ViR': 'Villarrica',
      'ur_ViM': 'Viña del Mar',
    }

    models.load_models({
      model: 'pos.order',
      fields: ['id', 'name', 'pos_reference','date_order', 'l10n_latam_document_number', 'l10n_latam_document_number_inv','note', 'signature', 'l10n_latam_document_type_id_code', 
               'to_ticket', 'to_invoice', 'partner_id', 'amount_total', 'session_id', 'user_id', 'lines', 'amount_tax'],
      loaded: function (self, pos_orders) {
          var orders = [];
          self.pos_orders = orders;
          self.order = [];
          for (var i in pos_orders) {
              self.order[i] = pos_orders[i];
          }
      },
      
    });

    for(var i=0; i<modules.length; i++){
      var model=modules[i];
      if(model.model === 'res.company'){
        model.fields.push('l10n_cl_dte_resolution_number', 'l10n_cl_dte_resolution_date', 'l10n_cl_activity_description', 'street', 'street2', 'l10n_cl_sii_regional_office');
      }
    };

    models.load_fields('res.partner', ['name','street','city','state_id','country_id','vat','lang',
                                       'phone','zip','mobile','email','barcode','write_date',
                                       'property_account_position_id','property_product_pricelist',
                                       'l10n_cl_activity_description', 'l10n_cl_dte_email', 'l10n_cl_sii_taxpayer_type']);
                                       

    var _super_order = models.Order.prototype;
	  models.Order = models.Order.extend({
      initialize: function (attr, options) {
        _super_order.initialize.call(this, attr, options);
        this.to_ticket = false;
        this.l10n_latam_document_number = this.l10n_latam_document_number || false;
        this.l10n_latam_document_number_inv = this.l10n_latam_document_number_inv || false;
      },
      export_as_JSON: function () {
        var json = _super_order.export_as_JSON.apply(this, arguments);
        json.to_ticket = this.to_ticket ? this.to_ticket : false;
        json.l10n_latam_document_number = this.l10n_latam_document_number;
        json.l10n_latam_document_number_inv = this.l10n_latam_document_number_inv;
        return json;
      },
      init_from_JSON: function (json) {//carga pedido individual
          _super_order.init_from_JSON.apply(this, arguments);
          this.l10n_latam_document_number = json.l10n_latam_document_number;
          this.l10n_latam_document_number_inv = json.l10n_latam_document_number_inv;
      },
      set_document_number_ticket: function (doc_number) {
          this.l10n_latam_document_number = doc_number;
      },
      export_for_printing: function() {
        var order = this.pos.get_order();
        var receipt = _super_order.export_for_printing.apply(this,arguments);
        receipt.l10n_cl_sii_barcode = this.barcode_pdf417();
        receipt.company.l10n_cl_dte_resolution_date = this.pos.company.l10n_cl_dte_resolution_date
        receipt.company.l10n_cl_dte_resolution_number = this.pos.company.l10n_cl_dte_resolution_number
        receipt.company.l10n_cl_activity_description = this.pos.company.l10n_cl_activity_description
        receipt.company.l10n_cl_sii_regional_office = L10N_CL_SII_REGIONAL_OFFICES_ITEMS[this.pos.company.l10n_cl_sii_regional_office]
        receipt.company.street = this.pos.company.street
        receipt.company.street2 = this.pos.company.street2
        receipt.l10n_latam_document_number = this.l10n_latam_document_number;
        receipt.l10n_latam_document_number_inv = order.l10n_latam_document_number_inv;
        console.log(receipt)
        return receipt;
      },
      set_to_ticket: function(to_ticket) {
        this.assert_editable();
        this.to_ticket = to_ticket;
        if (to_ticket) {
            return this.get_next_ticket_number();
        }
      },
      set_to_invoice: function(to_invoice) {
        this.assert_editable();
        this.to_invoice = to_invoice;
        if (to_invoice) {
          return this.get_next_invoice_number();
        }
    },
      get_next_invoice_number: function() {
        var order = this.pos.get_order()
        return rpc.query({
                  model: 'pos.order',
                  method: 'get_next_invoice_number',
              }, {
                  timeout: 9000,
                  shadow: true,
              }).then( function(result) {
                    order.l10n_latam_document_number_inv = parseInt(result)
                }
              )
      },

      get_next_ticket_number: function() {
          var order = this.pos.get_order()
          return rpc.query({
                    model: 'pos.order',
                    method: 'get_next_ticket_number',
                    args: [this.pos_session_id]    
                }, {
                    timeout: 9000,
                    shadow: true,
                }).then( function(result) {
                      order.l10n_latam_document_number = parseInt(result)
                  }
                )
      },
      is_to_ticket: function(){
          return this.to_ticket;
      },
      unset_to_ticket: function(){
        this.set_to_ticket(false);
      },
      barcode_pdf417: function(){
          console.log(this);
          var order = this.pos.get_order();
          PDF417.init(order.signature, 6);
          var barcode = PDF417.getBarcodeArray();
          var bw = 1.2;
          var bh = 2;
          var canvas = document.createElement('canvas');
          canvas.width = bw * barcode['num_cols'];
          canvas.height = 150;
          var ctx = canvas.getContext('2d');
          var y = 0;
          for (var r = 0; r < barcode['num_rows']; ++r) {
            var x = 0;
            for (var c = 0; c < barcode['num_cols']; ++c) {
              if (barcode['bcode'][r][c] == 1) {
                ctx.fillRect(x, y, bw, bh);
              }
              x += bw;
            }
            y += bh;
          }
          return canvas.toDataURL("image/png");
      },
      
    });
});
