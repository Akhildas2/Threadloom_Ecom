const PDFDocument = require('pdfkit');

const generateSalesReportPDF = (fullOrders, currentPage, limit, res) => {
    const doc = new PDFDocument({
        margin: 40 // Set margin for all sides
    });

    // Set the response headers
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=sales_report.pdf');

    // Pipe the document to the response
    doc.pipe(res);

    // Function to add pagination to the footer
    const addFooter = (pageNumber) => {
        doc.fontSize(10).text(`Page ${pageNumber}`, doc.page.width - 40, doc.page.height - 20, { align: 'right' });
    };

    // Function to generate content for a single page
    const generatePageContent = (startIndex, endIndex, pageNumber) => {
        const columnCount = 9; // Total number of columns
        const totalWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
        const slNoColumnWidth = 40; // Fixed width for the Sl No. column
        const otherColumnWidth = (totalWidth - slNoColumnWidth) / (columnCount - 1);
        const spaceAfterHeading = 20; // Adjust as needed
        const rowHeight = 40; // Adjust as needed

        // Add space before the heading
        doc.moveDown(spaceAfterHeading / 12);

        // Sales Report Heading
        doc.font('Helvetica-Bold').fontSize(24).text('Sales Report', {
            align: 'center'
        });

        doc.moveDown();

        // Add table headers with space
        doc.font('Helvetica-Bold').fontSize(10);
        const yHeader = doc.y;

        // Add slno column header
        doc.text('Sl No.', doc.page.margins.left, yHeader, {
            width: slNoColumnWidth,
            align: 'left'
        });

        // Adjust y positions for table headers
        const headers = ['Order ID', 'User', 'Product', 'Quantity', 'Price', 'Total', 'Discount', 'Order Date'];
        headers.forEach((header, index) => {
            doc.text(header, doc.page.margins.left + slNoColumnWidth + (index * otherColumnWidth), yHeader, {
                width: otherColumnWidth,
                align: 'left'
            });
        });

        // Draw line below the headers
        doc.moveTo(doc.page.margins.left, yHeader + 15).lineTo(doc.page.width - doc.page.margins.right, yHeader + 15).stroke();

        // Add table rows
        doc.font('Helvetica').fontSize(10);

        let y = yHeader + 30;
        let slno = 1;
        let currentOrderId = null; // Initialize current order ID to track changes
        for (let i = startIndex; i < endIndex; i++) {
            const order = fullOrders[i];
            order.items.forEach((item, index) => {
                if (y + rowHeight > doc.page.height - doc.page.margins.bottom - 30) {
                    // Add footer before adding a new page
                    addFooter(pageNumber);
                    doc.addPage();
                    y = doc.page.margins.top; // Reset y position for new page
                    pageNumber++; // Increment page number for the new page
                }

                doc.text(slno.toString(), doc.page.margins.left, y, {
                    width: slNoColumnWidth,
                    align: 'left'
                });

                // Adjust x positions for other columns
                const xPositions = {
                    orderId: doc.page.margins.left + slNoColumnWidth,
                    user: doc.page.margins.left + slNoColumnWidth + otherColumnWidth,
                    product: doc.page.margins.left + slNoColumnWidth + 2 * otherColumnWidth,
                    quantity: doc.page.margins.left + slNoColumnWidth + 3 * otherColumnWidth,
                    price: doc.page.margins.left + slNoColumnWidth + 4 * otherColumnWidth,
                    total: doc.page.margins.left + slNoColumnWidth + 5 * otherColumnWidth,
                    discount: doc.page.margins.left + slNoColumnWidth + 6 * otherColumnWidth,
                    orderDate: doc.page.margins.left + slNoColumnWidth + 7 * otherColumnWidth
                };

                // Display order details only if the order ID is different from the previous one
                if (order.ordersId !== currentOrderId) {
                    doc.text(order.ordersId, xPositions.orderId, y, {
                        width: otherColumnWidth,
                        align: 'left'
                    });
                    doc.text(order.userId.name, xPositions.user, y, {
                        width: otherColumnWidth,
                        align: 'left'
                    });
                    const offerDiscount = order.offerDiscount || 0;
                    const couponDiscount = order.couponDiscount || 0;
                    const fullDiscount = offerDiscount + couponDiscount;
                    doc.text(`Rs. ${fullDiscount.toFixed(2)}`, xPositions.discount, y, {
                        width: otherColumnWidth,
                        align: 'left'
                    });
                    doc.text(order.expectedDelivery.toLocaleDateString(), xPositions.orderDate, y, {
                        width: otherColumnWidth,
                        align: 'right'
                    });
                    currentOrderId = order.ordersId; // Update current order ID
                } else {
                    // Leave order details empty if the order ID is the same as the previous one
                    doc.text('', xPositions.orderId, y, {
                        width: otherColumnWidth,
                        align: 'left'
                    });
                    doc.text('', xPositions.user, y, {
                        width: otherColumnWidth,
                        align: 'left'
                    });
                    doc.text('', xPositions.discount, y, {
                        width: otherColumnWidth,
                        align: 'left'
                    });
                    doc.text('', xPositions.orderDate, y, {
                        width: otherColumnWidth,
                        align: 'left'
                    });
                }

                doc.text(item.productId.name.substring(0, 20), xPositions.product, y, {
                    width: otherColumnWidth,
                    align: 'left'
                });
                doc.text(item.quantity.toString(), xPositions.quantity, y, {
                    width: otherColumnWidth,
                    align: 'center'
                });
                doc.text(`Rs. ${item.price.toFixed(2)}`, xPositions.price, y, {
                    width: otherColumnWidth,
                    align: 'left'
                });
                doc.text(`Rs. ${item.total.toFixed(2)}`, xPositions.total, y, {
                    width: otherColumnWidth,
                    align: 'left'
                });

                slno++; // Increment slno
                y += rowHeight; // Move to the next row with increased space between lines
            });
        }

        // Draw lines for each row
        doc.lineWidth(1);
        const yHeaders = yHeader + 30;
        for (let i = yHeaders + 30; i <= y; i += rowHeight) {
            doc.moveTo(doc.page.margins.left, i).lineTo(doc.page.width - doc.page.margins.right, i).stroke();
        }

        // Add pagination to the footer for the current page
        addFooter(pageNumber);
    };

    // Calculate the total number of pages
    const totalPages = Math.ceil(fullOrders.length / limit);

    // Loop through each page
    for (let page = currentPage; page <= totalPages; page++) {
        // Start a new page only if it's not the first page
        if (page !== currentPage) {
            doc.addPage();
        }

        // Calculate the starting and ending index based on pagination
        const startIndex = (page - 1) * limit;
        const endIndex = Math.min(startIndex + limit, fullOrders.length);

        // Generate content for the current page
        generatePageContent(startIndex, endIndex, page);
    }

    // Finalize the PDF document
    doc.end();
};

module.exports = { generateSalesReportPDF };
