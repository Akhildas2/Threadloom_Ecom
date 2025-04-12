const PDFDocument = require('pdfkit');
const moment = require('moment');
const formatCurrency = (val) => `Rs.${val.toFixed(2)}`;



const generateSalesReportPDF = (fullOrders, startDate, endDate, res) => {
  // Create PDF document with A4 size and margins
  const doc = new PDFDocument({ margin: 50, size: 'A4' });
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', 'inline; filename="threadloom_sales_report.pdf"');
  doc.pipe(res);

  // Variables for pagination and row layout
  let currentY = 50;
  let currentPage = 1;
  const pageHeight = 750; // vertical space threshold for a new page
  const rowHeight = 20;

  // ===== HEADER SECTION =====
  const drawHeader = () => {
    // Draw background rectangle for the title (emulating Excel merged cell)
    doc.rect(50, 20, 500, 40).fill('#088178');
    // Title text
    doc.fillColor('#FFFFFF')
      .fontSize(24)
      .text('Threadloom Sales Report', 50, 25, { width: 500, align: 'center' });
    // Date info
    const formatDateSafe = (date) => {
      return date && moment(date).isValid() ? moment(date).format('DD MMM YYYY') : 'All Time';
    };

    doc.fillColor('#000')
      .fontSize(12)
      .text(`Report Period: ${formatDateSafe(startDate)} - ${formatDateSafe(endDate)}`, 50, 70, { align: 'center' });

    currentY = 100;
  };

  // ===== TABLE HEADER =====
  const drawTableHeader = () => {
    // Define headers and their positions (adjust as needed)
    // Columns: Order ID, Customer, Delivery Date, Product, Quantity, Unit Price, Discounts , Total Amount
    const columns = [
      { header: 'Order ID', x: 50, width: 60 },
      { header: 'Customer', x: 110, width: 80 },
      { header: 'Delivery Date', x: 190, width: 70 },
      { header: 'Product', x: 260, width: 100 },
      { header: 'Quantity', x: 360, width: 40 },
      { header: 'Unit Price', x: 400, width: 60 },
      { header: 'Discounts', x: 460, width: 50 },
      { header: 'Total', x: 510, width: 50 }
    ];

    // Draw header background
    doc.rect(50, currentY, 510, 20).fill('#088178');
    // Write header titles
    columns.forEach(col => {
      doc.fillColor('#FFFFFF')
        .fontSize(10)
        .text(col.header, col.x, currentY + 5, { width: col.width, align: 'center' });
    });
    currentY += 20;
  };

  // ===== ORDER ITEM ROW =====
  const truncate = (text, maxLength = 15) => {
    return text.length > maxLength ? text.slice(0, maxLength) + '...' : text;
  };

  const drawOrderItemRow = (order, item, isFirstItem) => {
    const deliveryDate = moment(item.deliveryDate).format('DD MMM YYYY');
    const product = truncate(item.productId.name);
    const quantity = item.quantity;
    const unitPrice = formatCurrency(item.price);

    const orderId = isFirstItem ? order.ordersId : '';
    const customer = isFirstItem ? `${order.deliveryAddress.fullName}\n${order.deliveryAddress.city}` : '';
    const discounts = isFirstItem ? formatCurrency(order.offerDiscount + order.couponDiscount) : '';
    const totalAmount = isFirstItem ? formatCurrency(order.totalAmount) : '';

    // Make sure new page if needed
    if (currentY + rowHeight > pageHeight) {
      drawFooter();
      doc.addPage();
      currentPage++;
      currentY = 50;
      drawTableHeader();
    }

    const columns = [
      { value: orderId, x: 50, width: 60 },
      { value: customer, x: 110, width: 80 },
      { value: deliveryDate, x: 190, width: 70 },
      { value: product, x: 260, width: 100 },
      { value: quantity.toString(), x: 360, width: 40 },
      { value: unitPrice, x: 400, width: 60 },
      { value: discounts, x: 460, width: 50 },
      { value: totalAmount, x: 510, width: 50 }
    ];

    // Draw row
    columns.forEach(col => {
      doc.fillColor('#333')
        .fontSize(10)
        .text(col.value, col.x, currentY + 5, { width: col.width, align: 'center' });
    });

    // Advance Y without adding space
    currentY += rowHeight;
  };



  // ===== FOOTER =====
  const drawFooter = () => {
    doc.fontSize(8)
      .fillColor('#999')
      .text(`Page ${currentPage}`, 50, 780, { align: 'left' })
      .text(`Generated on ${moment().format('LLL')}`, 0, 780, { align: 'right' });
  };

  // ===== SUMMARY SECTION =====
  const summaryData = {
    totalOrders: 0,
    totalSalesAmount: 0,
    totalDiscounts: 0
  };
  fullOrders.forEach(order => {
    if (order.items && order.items.length > 0) {
      summaryData.totalOrders++;
      summaryData.totalSalesAmount += order.totalAmount;
      summaryData.totalDiscounts += (order.offerDiscount || 0) + (order.couponDiscount || 0);
    }
  });

  // ===== BUILD THE REPORT =====
  drawHeader();
  drawTableHeader();

  // Loop through orders and then through each order's items, drawing a row for each.
  fullOrders.forEach(order => {
    if (order.items && order.items.length > 0) {
      let isFirstItem = true;
      order.items.forEach(item => {
        drawOrderItemRow(order, item, isFirstItem);
        isFirstItem = false;
      });
      // Optionally, add a separator line between orders
      doc.moveTo(50, currentY).lineTo(560, currentY).strokeColor('#CCCCCC').stroke();
    }
  });

  // Add summary section. If not enough space remains, start a new page.
  if (currentY + 60 > pageHeight) {
    drawFooter();
    doc.addPage();
    currentY = 50;
  }
  doc.moveDown();
  doc.fontSize(12)
    .fillColor('#000')
    .text('Sales Summary:', 50, currentY + 10);
  doc.fontSize(10)
    .text(`Total Orders: ${summaryData.totalOrders}`, 50, currentY + 30)
    .text(`Total Sales Amount: ${formatCurrency(summaryData.totalSalesAmount)}`, 200, currentY + 30)
    .text(`Total Discounts: ${formatCurrency(summaryData.totalDiscounts)}`, 400, currentY + 30);

  drawFooter();

  doc.end();
};



module.exports = { generateSalesReportPDF };