const PDFDocument = require('pdfkit');
const moment = require('moment');

const formatCurrency = (val) => `Rs.${val.toFixed(2)}`;

const generateInvoicePDF = (order, res) => {
    return new Promise((resolve, reject) => {
        try {
            const doc = new PDFDocument({ margin: 50, size: 'A4' });
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `inline; filename=Invoice-${order._id.toString().slice(-6)}.pdf`);
            doc.pipe(res);

            const colors = {
                primary: '#088178',
                text: '#333333',
                lightGray: '#f2f2f2',
                mediumGray: '#999999'
            };

            let currentY = 50;
            let currentPage = 1;
            const pageHeight = 750;
            const rowHeight = 30; // Increased row height for better spacing

            // ===== HEADER =====
            doc.rect(50, currentY - 30, 500, 40).fill(colors.primary);
            doc.fillColor('#fff')
                .fontSize(22)
                .text('Threadloom Invoice', 50, currentY - 25, { width: 500, align: 'center' });

            currentY += 30;
            doc.fillColor(colors.text)
                .fontSize(10)
                .text(`Invoice #: ${order.ordersId || order._id.toString().toUpperCase()}`, 50, currentY)
                .text(`Invoice Date: ${moment(order.date).format('DD MMM YYYY')}`, 400, currentY);

            currentY += 30;

            // ===== CUSTOMER & ORDER INFO SIDE BY SIDE =====
            const customerLeft = 50;
            const orderRight = 400;

            doc.font('Helvetica-Bold').fontSize(11).text('Billed To:', customerLeft, currentY);
            doc.font('Helvetica').fontSize(10)
                .text(order.deliveryAddress.fullName, customerLeft, currentY + 15)
                .text(`Email: ${order.userId?.email || 'N/A'}`, customerLeft, currentY + 30)
                .text(`Phone: ${order.deliveryAddress.mobileNumber}`, customerLeft, currentY + 45)
                .text(`Address: ${order.deliveryAddress.houseNo}, ${order.deliveryAddress.area}`, customerLeft, currentY + 60)
                .text(`${order.deliveryAddress.city}, ${order.deliveryAddress.state} - ${order.deliveryAddress.pincode}`, customerLeft, currentY + 75);

            doc.font('Helvetica-Bold').fontSize(11).text('Order Details:', orderRight, currentY);
            doc.font('Helvetica').fontSize(10)
                .text(`Order Date: ${moment(order.date).format('DD MMM YYYY')}`, orderRight, currentY + 15)
                .text(`Payment Method: ${order.paymentMethod || 'N/A'}`, orderRight, currentY + 30)
                .text(`Payment Status: ${order.status || 'N/A'}`, orderRight, currentY + 45)

            currentY += 110;
            // ===== TABLE HEADER =====
            const tableX = 50;
            const tableWidth = 500;
            const columns = [
                { header: 'Product', x: tableX, width: 240, align: 'left' },
                { header: 'Qty', x: tableX + 240, width: 40, align: 'center' },
                { header: 'Delivery Date', x: tableX + 280, width: 80, align: 'center' },
                { header: 'Unit Price', x: tableX + 360, width: 70, align: 'center' },
                { header: 'Total', x: tableX + 430, width: 70, align: 'center' }
            ];

            // Extend product name to fit nicely in its column
            const extendProductName = (name) => {
                return (name + " ").substring(0, 240);
            };

            const drawTableHeader = () => {
                doc.fillColor(colors.primary)
                    .rect(tableX, currentY, tableWidth, rowHeight)
                    .fill();

                doc.fillColor('#fff').fontSize(10);
                columns.forEach(col => {
                    doc.text(col.header, col.x, currentY + 7, { width: col.width, align: col.align });
                });
                currentY += rowHeight;
            };

            // ===== DRAW HEADER FIRST =====
            drawTableHeader();

            // ===== ITEMS =====
            order.items.forEach((item, index) => {
                if (item.orderStatus !== 'delivered') return;

                if (currentY + rowHeight > pageHeight - 100) {
                    drawFooter();
                    doc.addPage();
                    currentPage++;
                    currentY = 50;
                    drawTableHeader();
                }

                const total = item.quantity * item.price;

                // Alternating row background
                if (index % 2 === 0) {
                    doc.rect(tableX, currentY, tableWidth, rowHeight).fill(colors.lightGray);
                }

                const extendedProductName = extendProductName(item.productId?.name || 'Product');

                doc.fillColor(colors.text)
                    .fontSize(10)
                    .text(extendedProductName, columns[0].x, currentY + 6, { width: columns[0].width, align: columns[0].align, ellipsis: true })
                    .text(item.quantity.toString(), columns[1].x, currentY + 6, { width: columns[1].width, align: columns[1].align })
                    .text(moment(item.deliveryDate).format('DD MMM YYYY'), columns[2].x, currentY + 6, { width: columns[2].width, align: columns[2].align })
                    .text(formatCurrency(item.price), columns[3].x, currentY + 6, { width: columns[3].width, align: columns[3].align })
                    .text(formatCurrency(total), columns[4].x, currentY + 6, { width: columns[4].width, align: columns[4].align });

                currentY += rowHeight;
            });

            // ===== SUMMARY SECTION =====
            const summaryStartY = currentY + 20;
            const summaryBoxHeight = 120;

            if (summaryStartY + summaryBoxHeight > pageHeight) {
                drawFooter();
                doc.addPage();
                currentPage++;
                currentY = 50;
            } else {
                currentY = summaryStartY;
            }

            // Summary box styling
            doc.rect(300, currentY, 250, summaryBoxHeight)
                .fill(colors.lightGray);

            const subtotal = order.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
            const discounts = (order.couponDiscount || 0) + (order.offerDiscount || 0);
            const shipping = order.shippingCharge || 0;
            const grandTotal = order.totalAmount || (subtotal - discounts + shipping);

            doc.fontSize(11)
                .fillColor(colors.text)
                .font('Helvetica-Bold')
                .text('Order Summary', 310, currentY + 10);

            const summaryItems = [
                { label: 'Subtotal:', value: subtotal },
                { label: 'Discounts:', value: -discounts },
                { label: 'Shipping:', value: shipping },
                { label: 'Grand Total:', value: grandTotal }
            ];

            let summaryY = currentY + 35;
            summaryItems.forEach((item, index) => {
                doc.font(index === summaryItems.length - 1 ? 'Helvetica-Bold' : 'Helvetica')
                    .fillColor(colors.text)
                    .text(item.label, 310, summaryY)
                    .text(formatCurrency(item.value), 460, summaryY, { align: 'right' });
                summaryY += 20;
            });

            currentY += summaryBoxHeight + 20;

            // ===== FOOTER =====
            const drawFooter = () => {
                doc.fontSize(9)
                    .fillColor(colors.mediumGray)
                    .text('Thank you for shopping with Threadloom!', 50, 780)
                    .text(`Page ${currentPage}`, 500, 780, { align: 'right' });
            };

            drawFooter();

            doc.end();

            doc.on('end', () => resolve());
            doc.on('error', (err) => reject(err));
        } catch (err) {
            reject(err);
        }
    });
};

module.exports = {
    generateInvoicePDF
};