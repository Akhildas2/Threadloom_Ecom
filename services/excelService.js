const ExcelJS = require('exceljs');



const generateSalesReportExcel = async (fullOrders, res) => {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Sales Report');
    const themeColor = '088178';

    // ===== Title Section =====
    worksheet.mergeCells('A1:J3');
    const titleCell = worksheet.getCell('A1');
    titleCell.value = 'Threadloom Sales Report';
    titleCell.font = { size: 24, bold: true, color: { argb: 'FFFFFFFF' } };
    titleCell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
    titleCell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: themeColor }
    };

    // Date Info
    worksheet.mergeCells('A4:J4');
    worksheet.getCell('A4').value = `Generated: ${new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}`;
    worksheet.getCell('A4').font = { italic: true };
    worksheet.getCell('A4').alignment = { horizontal: 'center' };

    // ===== Header Row =====
    const headerRow = worksheet.addRow([
        '#', 'Order ID', 'Customer', 'Delivery Date',
        'Product Details', 'Quantity', 'Unit Price',
        'Total Discount', 'Payment Method', 'Total Amount'
    ]);

    headerRow.eachCell(cell => {
        cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
        cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: themeColor }
        };
        cell.border = {
            top: { style: 'thin', color: { argb: '000000' } },
            bottom: { style: 'thin', color: { argb: '000000' } },
            left: { style: 'thin', color: { argb: '000000' } },
            right: { style: 'thin', color: { argb: '000000' } }
        };
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
    });

    // ===== Column Widths =====
    worksheet.columns = [
        { width: 5 },   // #
        { width: 18 },  // Order ID
        { width: 25 },  // Customer
        { width: 16 },  // Delivery Date
        { width: 40 },  // Product
        { width: 10 },  // Quantity
        { width: 12 },  // Price
        { width: 18 },  // Discount
        { width: 20 },  // Payment
        { width: 15 }   // Total
    ];

    let orderCounter = 1;
    let overallTotal = 0;
    let overallDiscount = 0;
    let totalOrders = 0;

    // ===== Order Data Rows =====
    fullOrders.forEach((order, orderIndex) => {
        if (order.items.length === 0) return;

        totalOrders++;
        let isFirstItem = true;

        order.items.forEach((item) => {
            const row = worksheet.addRow([
                isFirstItem ? orderCounter : '',
                isFirstItem ? order.ordersId : '',
                isFirstItem ? `${order.deliveryAddress.fullName}\n${order.deliveryAddress.city}` : '',
                new Date(item.deliveryDate).toLocaleDateString('en-IN', {
                    day: '2-digit', month: 'short', year: 'numeric'
                }),
                item.productId.name,
                item.quantity,
                item.price.toLocaleString('en-IN', { style: 'currency', currency: 'INR' }),
                isFirstItem ? (order.offerDiscount + order.couponDiscount).toLocaleString('en-IN', { style: 'currency', currency: 'INR' }) : '',
                isFirstItem ? {
                    cod: 'COD (Cash on Delivery)',
                    paypal: 'PayPal',
                    wallet: 'Wallet'
                }[order.paymentMethod] : '',
                isFirstItem ? order.totalAmount.toLocaleString('en-IN', { style: 'currency', currency: 'INR' }) : ''
            ]);

            // Style cells
            row.eachCell(cell => {
                cell.alignment = { vertical: 'middle', horizontal: 'left', wrapText: true };
                cell.border = { bottom: { style: 'thin', color: { argb: 'DDDDDD' } } };
            });

            // Numeric alignments
            row.getCell(6).alignment = { horizontal: 'center' };
            row.getCell(7).alignment = { horizontal: 'right' };
            row.getCell(10).alignment = { horizontal: 'right' };

            // Alternate row fill
            if (orderIndex % 2 === 0) {
                row.eachCell(cell => {
                    cell.fill = {
                        type: 'pattern',
                        pattern: 'solid',
                        fgColor: { argb: 'F9F9F9' }
                    };
                });
            }

            // Payment method color
            if (isFirstItem) {
                const paymentCell = row.getCell(9);
                paymentCell.font = {
                    color: {
                        cod: { argb: themeColor },
                        paypal: { argb: '003087' },
                        wallet: { argb: '228B22' }
                    }[order.paymentMethod]
                };
            }

            isFirstItem = false;
        });

        // Single-line separator row
        const separatorRow = worksheet.addRow([]);
        separatorRow.eachCell({ includeEmpty: true }, (cell, colNumber) => {
            cell.border = {
                bottom: { style: 'thin', color: { argb: 'CCCCCC' } }
            };
        });

        orderCounter++;
        overallTotal += order.totalAmount;
        overallDiscount += (order.offerDiscount || 0) + (order.couponDiscount || 0);
    });

    // ===== Summary Section =====
    worksheet.addRow([]);
    const summaryRowStart = worksheet.rowCount + 1;
    
    // Merge B to F for title instead of A to E
    worksheet.mergeCells(`B${summaryRowStart}:F${summaryRowStart}`);
    const summaryTitle = worksheet.getCell(`B${summaryRowStart}`);
    summaryTitle.value = 'Sales Summary';
    summaryTitle.font = { size: 16, bold: true, color: { argb: themeColor } };
    
    const summaryData = [
        ['Total Orders:', totalOrders],
        ['Total Sales Amount:', overallTotal.toLocaleString('en-IN', { style: 'currency', currency: 'INR' })],
        ['Total Discounts:', overallDiscount.toLocaleString('en-IN', { style: 'currency', currency: 'INR' })],
        ['Net Sales:', (overallTotal - overallDiscount).toLocaleString('en-IN', { style: 'currency', currency: 'INR' })]
    ];
    
    summaryData.forEach(([label, value], index) => {
        // Add an empty cell at the beginning to shift data to start from column B
        const row = worksheet.addRow(['', label, value]);
    
        const labelCell = row.getCell(2); // Column B
        const valueCell = row.getCell(3); // Column C
    
        labelCell.font = { bold: true };
        valueCell.alignment = { horizontal: 'right' };
    
        const highlight = index === summaryData.length - 1;
        const bgColor = highlight ? 'D9F2EC' : 'FFFFFF';
    
        [labelCell, valueCell].forEach(cell => {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bgColor } };
            cell.border = {
                top: { style: 'thin', color: { argb: 'CCCCCC' } },
                bottom: { style: 'thin', color: { argb: 'CCCCCC' } },
                left: { style: 'thin', color: { argb: 'CCCCCC' } },
                right: { style: 'thin', color: { argb: 'CCCCCC' } }
            };
        });
    });
    
    // ===== Footer =====
    worksheet.addRow([]);
    const footerRow = worksheet.addRow(['Generated by Threadloom Admin Panel']);
    worksheet.mergeCells(`A${footerRow.number}:J${footerRow.number}`);
    footerRow.getCell(1).font = { italic: true, size: 10, color: { argb: '888888' } };
    footerRow.getCell(1).alignment = { horizontal: 'center' };

    // ===== Output the File =====
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=threadloom_sales_report.xlsx');

    await workbook.xlsx.write(res);
    res.end();
};



module.exports = { generateSalesReportExcel };