odoo.define('l10n_cl_pos_fe.PaymentScreen', function (require) {
    'use strict';

    const PaymentScreen = require('point_of_sale.PaymentScreen');
    const Registries = require('point_of_sale.Registries');

    const FePaymentScreen = (PaymentScreen) =>
        class extends PaymentScreen {
            toggleIsToTicket() {
                var self = this;
                this.currentOrder.set_to_invoice(false)
                this.currentOrder.set_to_ticket(!this.currentOrder.is_to_ticket()).then(
                    function (){
                        self.get_caf();
                        self.render();
                    }
                );
                self.render();
            }
            toggleIsToInvoice() {
                var self = this;
                var client = self.env.pos.get_client()
                console.log(client)
                if (client.vat && client.l10n_cl_sii_taxpayer_type && client.l10n_cl_activity_description) {
                    this.unset_to_ticket()
                    this.currentOrder.set_to_invoice(!this.currentOrder.is_to_invoice()).then(
                        function (){
                            self.get_caf();
                            self.render();
                        }
                    );
                } else {
                    return self.showPopup('ErrorPopup',{
                        'title': self.env._t('Falta Informacion en el Cliente'),
                        'body': self.env._t('Verifique el RUT, direccion y tipo de contribuyente'),
                    });
                }
                self.render();
            }
            unset_to_ticket(){
                this.currentOrder.unset_to_ticket();
            }
            get_type_document() {
                var document = 'Ticket';
                if (this.currentOrder.to_invoice) {
                    document = 'FACTURA [33]';
                }
                if (this.currentOrder.to_ticket) {
                    document = 'BOLETA [39]';
                }
                return document;
            }
            get_caf() {
                const order = this.currentOrder;
                var caf = 0
                if (order.to_ticket){
                    caf = order.l10n_latam_document_number;
                }
                if (order.to_invoice) {
                    caf = order.l10n_latam_document_number_inv;
                }
                return caf;
            }
//            get_remaining_caf() {
//                const order = this.currentOrder;
//                var remaining = 0;
//                if (order.to_ticket){
//                    remaining = this.env.pos.pos_session.remaining_docs;
//                }
//                return remaining;
//            }
            
        };

        Registries.Component.extend(PaymentScreen, FePaymentScreen);
        return FePaymentScreen;

});