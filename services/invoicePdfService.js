const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

const generateInvoicePDF = (order) => {
    console.log("Order generated", order);
    return new Promise((resolve, reject) => {
        const doc = new PDFDocument({ margin: 50 });

        // Ensure the invoices directory exists
        const invoicesDir = path.join(__dirname, '..', 'invoices');
        if (!fs.existsSync(invoicesDir)) {
            fs.mkdirSync(invoicesDir);
        }

        // Set up the file path and stream
        const invoicePath = path.join(invoicesDir, `invoice-${order.ordersId}.pdf`);
        const writeStream = fs.createWriteStream(invoicePath);
        doc.pipe(writeStream);

        // Header
        generateHeader(doc, order);
        generateCustomerInformation(doc, order);

        // Generate the invoice table only if there are delivered products
        const hasDeliveredProducts = order.items.some(item => item.orderStatus === 'delivered');
        if (hasDeliveredProducts) {
            generateInvoiceTable(doc, order);
        }

        generateOrderInformation(doc, order);
        generateChargesAndDiscounts(doc, order);
        generateFooter(doc);

        // Finalize the PDF and end the stream
        doc.end();

        // Resolve the promise when the file is written
        writeStream.on('finish', () => {
            resolve(invoicePath);
        });

        // Reject the promise on error
        writeStream.on('error', (err) => {
            reject(err);
        });
    });
};

const generateHeader = (doc, order) => {
    doc
        .fontSize(20)
        .text('INVOICE', { align: 'center' })
        .fontSize(10)
        .moveDown()
        .text(`Order ID: ${order.ordersId}`, { align: 'right' })
        .moveDown();
};

const generateCustomerInformation = (doc, order) => {
    doc
        .fontSize(14)
        .text(`Order Date: ${order.date.toDateString()}`, { align: 'right' })
        .text(`Expected Delivery Date: ${new Date(order.expectedDelivery).toDateString()}`, { align: 'right' })
        .moveDown();

    doc
        .fillColor('#000000')
        .fontSize(16)
        .text('Billing Address:')
        .moveDown()
        .fontSize(12)
        .text(`Name: ${order.deliveryAddress.fullName}`)
        .text(`Email: ${order.userId.email}`)
        .text(`Phone Number: ${order.deliveryAddress.mobileNumber}`)
        .text(`Address: ${order.deliveryAddress.houseNo}, ${order.deliveryAddress.area}, ${order.deliveryAddress.city}, ${order.deliveryAddress.state}, ${order.deliveryAddress.pincode}`)
        .moveDown();
};

const generateOrderInformation = (doc, order) => {
    doc
        .fontSize(16)
        .text('Order Information:')
        .moveDown()
        .fontSize(12)
        .text(`Total Amount:  Rs.${order.totalAmount}`)
        .text(`Payment Method: ${order.paymentMethod}`)
        .text(`Payment Status: ${order.status}`)
        .moveDown();
};

const generateChargesAndDiscounts = (doc, order) => {
    doc
        .fontSize(16)
        .text('Charges & Discounts:')
        .moveDown()
        .fontSize(12);

    if (order.shippingCharge > 0) {
        doc.text(`Shipping Charges: Rs.${order.shippingCharge}`);
    }
    if (order.couponDiscount > 0) {
        doc.text(`Coupon Discount:  Rs.${order.couponDiscount}`);
    }
    if (order.offerDiscount > 0) {
        doc.text(`Offer Discount:  Rs.${order.offerDiscount}`).moveDown();
    }
};

const generateInvoiceTable = (doc, order) => {
    const invoiceTableTop = 300;
    const descriptionX = 50;
    const quantityX = 300;
    const priceX = 350;
    const totalX = 450;

    doc
        .fontSize(16)
        .text('Other Products:')
        .moveDown()
        .fontSize(12);

    doc
        .fontSize(12)
        .text('Product Name', descriptionX, invoiceTableTop, { bold: true })
        .text('Quantity', quantityX, invoiceTableTop, { bold: true })
        .text('Price', priceX, invoiceTableTop, { bold: true })
        .text('Total', totalX, invoiceTableTop, { bold: true })
        .moveDown();

    let yPosition = invoiceTableTop + 25;

    order.items.forEach((item) => {
        if (item.orderStatus === 'delivered') {
            const totalPrice = item.price * item.quantity;
            doc
                .fontSize(10)
                .text(item.productId.name, descriptionX, yPosition)
                .text(item.quantity, quantityX, yPosition)
                .text(`Rs.${item.price.toFixed(2)}`, priceX, yPosition)
                .text(`Rs.${totalPrice.toFixed(2)}`, totalX, yPosition);
            yPosition += 25;
        }
    });
};

const generateFooter = (doc) => {
    doc
        .fontSize(10)
        .text('Thank you for your business.', 50, 600, {
            align: 'center',
            width: 500
        });
};

module.exports = {
    generateInvoicePDF,
};
