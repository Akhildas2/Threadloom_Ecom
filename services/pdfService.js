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
        const columnWidth = (doc.page.width - doc.page.margins.left - doc.page.margins.right) / 8; // Adjusted for 8 columns
        const headerTopMargin = 70; // Adjust as needed
        const spaceAfterHeading = 20; // Adjust as needed
    
        // Sales Report Heading
        doc.font('Helvetica-Bold').fontSize(24).text('Sales Report', {
            align: 'center'
        });
    
        doc.moveDown();
    
        // Add space after the heading
        doc.moveDown(spaceAfterHeading / 12); 
    
        // Add table headers with space
        doc.font('Helvetica-Bold').fontSize(10);
        const yHeader = headerTopMargin + spaceAfterHeading; 
    
        // Add slno column header
        doc.text('Sl No.', doc.page.margins.left, yHeader, {
            width: columnWidth,
            align: 'left'
        });
    
        // Adjust y positions for table headers
        const headerYPositions = {
            orderId: yHeader,
            user: yHeader,
            product: yHeader,
            quantity: yHeader,
            total: yHeader,
            discount: yHeader,
            orderDate: yHeader
        };
    
        // Draw table headers
        Object.keys(headerYPositions).forEach((key, index) => {
            doc.text(key.charAt(0).toUpperCase() + key.slice(1), doc.page.margins.left + (index + 1) * columnWidth, headerYPositions[key], {
                width: columnWidth,
                align: 'left'
            });
        });
    
        // Draw line below the headers
        doc.moveTo(doc.page.margins.left, yHeader + 15).lineTo(doc.page.width - doc.page.margins.right, yHeader + 15).stroke();
    
        // Add table rows
        doc.font('Helvetica').fontSize(10);
        let y = yHeader + 20; // Start below the header and line
        let slno =  1;
        for (let i = startIndex; i < endIndex; i++) {
            const order = fullOrders[i];
            order.items.forEach((item, index) => {
                doc.text(slno.toString(), doc.page.margins.left, y, { // Add slno
                    width: columnWidth,
                    align: 'left'
                });

                doc.text(order.ordersId, doc.page.margins.left + columnWidth, y, {
                    width: columnWidth,
                    align: 'left'
                });
                doc.text(order.userId.name, doc.page.margins.left + 2 * columnWidth, y, {
                    width: columnWidth,
                    align: 'left'
                });
                doc.text(item.productId.name.substring(0, 20), doc.page.margins.left + 3 * columnWidth, y, {
                    width: columnWidth,
                    align: 'left'
                });
                doc.text(item.quantity.toString(), doc.page.margins.left + 4 * columnWidth, y, {
                    width: columnWidth,
                    align: 'center'
                });
                doc.text(item.price.toString(), doc.page.margins.left + 5 * columnWidth, y, {
                    width: columnWidth,
                    align: 'left'
                });
                const offerDiscount = order.offerDiscount || 0;
                const couponDiscount = order.couponDiscount || 0;
                const fullDiscount = offerDiscount + couponDiscount;
                doc.text(fullDiscount.toFixed(2), doc.page.margins.left + 6 * columnWidth, y, {
                    width: columnWidth,
                    align: 'left'
                });
                doc.text(order.expectedDelivery.toLocaleDateString(), doc.page.margins.left + 7 * columnWidth, y, {
                    width: columnWidth,
                    align: 'left'
                });
                slno++; // Increment slno
                y += 30; // Move to the next row with increased space between lines
            });
        }
    
        // Draw lines for each row
        doc.lineWidth(1);
        const yHeaders = yHeader + 15
        for (let i = yHeaders + 30; i <= y; i += 30) {
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
