const ExcelJS = require('exceljs');



const generateSalesReportExcel = (fullOrders, res) => {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Sales Report');

    //add title
    worksheet.columns = [
        { header: '#', key: 'index', width: 5 },
        { header: 'Order ID', key: 'ordersId', width: 20 },
        { header: 'Delivery Date', key: 'expectedDelivery', width: 20 },
        { header: 'Customer Name', key: 'customerName', width: 30 },
        { header: 'Product Name', key: 'productName', width: 70 },
        { header: 'Quantity', key: 'quantity', width: 10 },
        { header: 'Price', key: 'price', width: 10 },
        { header: 'Full Discount', key: 'fullDiscount', width: 15 },
        { header: 'Payment Method', key: 'paymentMethod', width: 25 },
        { header: 'Total', key: 'total', width: 15 },
    ];


    fullOrders.forEach((order, orderIndex) => {
        order.items.forEach((item, itemIndex) => {
            worksheet.addRow({
                index: itemIndex === 0 ? orderIndex + 1 : '',
                ordersId: itemIndex === 0 ? order.ordersId : '',
                expectedDelivery: itemIndex === 0 ? new Date(order.expectedDelivery).toDateString() : '',
                customerName: itemIndex === 0 ? order.deliveryAddress.fullName : '',
                productName: item.productId.name,
                quantity: item.quantity,
                price: `₹${item.price}`,
                fullDiscount: itemIndex === 0 ? `₹${(order.offerDiscount + order.couponDiscount).toFixed(2)}` : '',
                paymentMethod: itemIndex === 0 ? order.paymentMethod : '',
                total: itemIndex === 0 ? `₹${order.totalAmount.toFixed(2)}` : '',
            });
        });
    });


    // Configure the response to download the Excel file
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=sales_report.xlsx');

    // Write the Excel file to the response
    workbook.xlsx.write(res).then(() => res.end());

}



module.exports = { generateSalesReportExcel };