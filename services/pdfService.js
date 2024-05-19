const PDFDocument = require('pdfkit');

const generateSalesReportPDF = (fullOrders, currentPage, limit, res) => {
    const doc = new PDFDocument({
        margin: 50 // Set margin for all sides
    });

    // Set the response headers
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=sales_report.pdf');

    // Pipe the document to the response
    doc.pipe(res);

    // Function to add pagination to the footer
    const addFooter = (pageNumber) => {
        doc.fontSize(10).text(`Page ${pageNumber}`, doc.page.width - 50, doc.page.height - 20, { align: 'right' });
    };

    // Function to generate content for a single page
    const generatePageContent = (startIndex, endIndex, pageNumber) => {
        // Add table headers
        const columnWidth = (doc.page.width - doc.page.margins.left - doc.page.margins.right) / 7;
        const yHeader = doc.page.margins.top + 20; // Add margin for the header
        doc.font('Helvetica-Bold').fontSize(10);
        doc.text('Order ID', doc.page.margins.left, yHeader);
        doc.text('User', doc.page.margins.left + columnWidth, yHeader);
        doc.text('Product', doc.page.margins.left + 2 * columnWidth, yHeader);
        doc.text('Quantity', doc.page.margins.left + 3 * columnWidth, yHeader);
        doc.text('Total', doc.page.margins.left + 4 * columnWidth, yHeader);
        doc.text('Discount', doc.page.margins.left + 5 * columnWidth, yHeader);
        doc.text('Order Date', doc.page.margins.left + 6 * columnWidth, yHeader);

        // Add table rows
        doc.font('Helvetica').fontSize(10);
        let y = yHeader + 20; // Start below the header
        for (let i = startIndex; i < endIndex; i++) {
            const order = fullOrders[i];
            order.items.forEach((item, index) => {
                doc.text(order.ordersId, doc.page.margins.left, y);
                doc.text(order.userId.name, doc.page.margins.left + columnWidth, y);
                doc.text(item.productId.name.substring(0, 20), doc.page.margins.left + 2 * columnWidth, y);
                doc.text(item.quantity.toString(), doc.page.margins.left + 3 * columnWidth, y);
                doc.text(item.price.toString(), doc.page.margins.left + 4 * columnWidth, y);
                const offerDiscount = order.offerDiscount || 0;
                const couponDiscount = order.couponDiscount || 0;
                const fullDiscount = offerDiscount + couponDiscount;
                doc.text(fullDiscount.toFixed(2), doc.page.margins.left + 5 * columnWidth, y);
                doc.text(order.expectedDelivery.toLocaleDateString(), doc.page.margins.left + 6 * columnWidth, y);
                y += 20; // Move to the next row
            });
        }

        // Draw lines for each row
        doc.lineWidth(1);
        for (let i = yHeader + 30; i <= y; i += 20) {
            doc.moveTo(doc.page.margins.left, i).lineTo(doc.page.width - doc.page.margins.right, i).stroke();
        }

        // Add pagination to the footer
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
