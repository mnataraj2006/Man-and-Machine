const WhatsAppAutomation = require('../models/WhatsAppAutomation');
const whatsappService = require('./whatsappService');

// This boundary keeps finance/membership as the source of truth. Notification failures are isolated.
const queuePaymentConfirmation = async ({ client, branch, invoice, payment, triggeredBy }) => {
  const automation = await WhatsAppAutomation.findOne({ key: 'PAYMENT_CONFIRMATION' }).lean();
  if (!automation?.enabled || !client?.whatsappOptIn) return null;
  return whatsappService.queueTemplateMessage({
    clientId: client._id, branchId: branch?._id || invoice.branchId, phoneNumber: client.phone,
    templateName: automation.templateName || 'payment_receipt', messageType: 'PAYMENT_CONFIRMATION',
    variables: { member_name: client.name, amount: Number(payment.amount).toFixed(2), invoice_number: invoice.invoiceNumber, payment_method: payment.paymentMethod, branch_name: branch?.city || 'MAN & MACHINE' },
    triggeredBy, eventKey: `payment-confirmation:${payment._id}`,
  });
};

module.exports = { queuePaymentConfirmation };
