const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');



const generateInvoicePDF = (order) => {
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
        drawLine(doc);
        generateOrderInformation(doc, order);
        drawLine(doc);
        generateChargesAndDiscounts(doc, order);
        drawLine(doc);
        // Generate the invoice table only if there are delivered products
        const hasDeliveredProducts = order.items.some(item => item.orderStatus === 'delivered');
        if (hasDeliveredProducts) {
            generateInvoiceTable(doc, order);
        }

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



//for drawing line 
const drawLine = (doc) => {
    doc.moveDown()
        .moveTo(50, doc.y)
        .lineTo(550, doc.y)
        .stroke()
        .moveDown();
};



//for the header
const generateHeader = (doc, order) => {
    doc
        .fontSize(20)
        .text('INVOICE', { align: 'center' })
        .fontSize(10)
        .moveDown()
        .text(`Order ID: ${order.ordersId}`, { align: 'right' })
        .moveDown();
};



//for customer info 
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
        .text(`Name: ${order.deliveryAddress.fullName}`).moveDown(0.3)
        .text(`Email: ${order.userId.email}`).moveDown(0.3)
        .text(`Phone Number: ${order.deliveryAddress.mobileNumber}`).moveDown(0.3)
        .text(`Address: ${order.deliveryAddress.houseNo}, ${order.deliveryAddress.area}, ${order.deliveryAddress.city}, ${order.deliveryAddress.state}, ${order.deliveryAddress.pincode}`).moveDown(0.3)
};



//for charges and discount 
const generateChargesAndDiscounts = (doc, order) => {
    doc
        .fontSize(16)
        .text('Charges & Discounts:')
        .moveDown()
        .fontSize(12);

    if (order.shippingCharge > 0) {
        doc.text(`Shipping Charges: Rs.${order.shippingCharge}`).moveDown(0.3);
    }
    if (order.couponDiscount > 0) {
        doc.text(`Coupon Discount:  Rs.${order.couponDiscount}`).moveDown(0.3);
    }
    if (order.offerDiscount > 0) {
        doc.text(`Offer Discount:  Rs.${order.offerDiscount}`).moveDown(0.3);
    }
};



//for order info
const generateOrderInformation = (doc, order) => {
    doc
        .fontSize(16)
        .text('Order Information:')
        .moveDown()
        .fontSize(12)
    doc.text(`Total Amount:  Rs.${order.totalAmount}`).moveDown(0.3)
        .text(`Payment Method: ${order.paymentMethod}`).moveDown(0.3)
        .text(`Payment Status: ${order.status}`).moveDown(0.3)
};



//for item showing like table
const generateInvoiceTable = (doc, order) => {
    const invoiceTableTop = 550;
    const descriptionX = 50;
    const quantityX = 300;
    const priceX = 380;
    const totalX = 450;

    doc
        .fontSize(16)
        .text('Delivered Items:', descriptionX)
        .moveDown()
        .fontSize(12);

    drawLine(doc);
    doc
        .fontSize(12)
        .text('Product Name', descriptionX, invoiceTableTop, { bold: true })
        .text('Quantity', quantityX, invoiceTableTop, { bold: true })
        .text('Price', priceX, invoiceTableTop, { bold: true })
        .text('Total', totalX, invoiceTableTop, { bold: true })
        .moveDown();

    let yPosition = invoiceTableTop + 30;

    order.items.forEach((item) => {
        if (item.orderStatus === 'delivered') {
            const totalPrice = item.price * item.quantity;
            doc
                .fontSize(10)
                .text(item.productId.name, descriptionX, yPosition)
                .text(item.quantity, quantityX, yPosition)
                .text(`Rs.${item.price.toFixed(2)}`, priceX, yPosition)
                .text(`Rs.${totalPrice.toFixed(2)}`, totalX, yPosition);
            drawLine(doc);

            yPosition += 35;

        }

    });
    doc.moveDown();

};



//for the footer 
const generateFooter = (doc) => {
    doc
        .fontSize(18)
        .text('Thank you for your business with Threadloom.', 50, 700, {
            align: 'center',
            width: 500,
            bold: true
        });
};



module.exports = {
    generateInvoicePDF,
};
