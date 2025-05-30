export const generateBillHTML = (sale) => {
  const date = new Date(sale.createdAt).toLocaleDateString("en-IN", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const time = new Date(sale.createdAt).toLocaleTimeString("en-IN");

  let customerInfo = "";
  if (sale.customer) {
    customerInfo = `
        <div class="customer-info">
          <h3>Customer Details</h3>
          <p><strong>Name:</strong> ${sale.customer.name}</p>
          <p><strong>Phone:</strong> ${sale.customer.contactNumber || "N/A"}</p>
          <p><strong>Address:</strong> ${sale.customer.address || "N/A"}</p>
        </div>
      `;
  }

  let itemsHTML = "";
  sale.items.forEach((item, index) => {
    const medicineName = item.medicine.name;
    const expiryDate = new Date(item.expiryDate).toLocaleDateString("en-IN", {
      year: "numeric",
      month: "short",
    });

    itemsHTML += `
        <tr>
          <td>${index + 1}</td>
          <td>${medicineName}</td>
          <td>${item.batchNumber}</td>
          <td>${expiryDate}</td>
          <td>${item.quantity}</td>
          <td>₹${item.mrp.toFixed(2)}</td>
          <td>${item.discount ? item.discount + "%" : "0%"}</td>
          <td>₹${item.totalAmount.toFixed(2)}</td>
        </tr>
      `;
  });

  return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Invoice - ${sale.billNumber}</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            margin: 0;
            padding: 0;
            color: #333;
          }
          .invoice-container {
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
          }
          .invoice-header {
            text-align: center;
            margin-bottom: 20px;
            border-bottom: 2px solid #4CAF50;
            padding-bottom: 10px;
          }
          .invoice-header h1 {
            color: #4CAF50;
            margin: 0;
          }
          .invoice-header p {
            margin: 5px 0;
          }
          .license-info {
            text-align: center;
            margin-top: 8px;
            font-size: 0.9em;
            color: #666;
            font-weight: 500;
          }
          .invoice-details {
            display: flex;
            justify-content: space-between;
            margin-bottom: 20px;
          }
          .invoice-details .left, .invoice-details .right {
            flex: 1;
          }
          .customer-info {
            margin-bottom: 20px;
            padding: 10px;
            border: 1px solid #ddd;
            border-radius: 5px;
          }
          .customer-info h3 {
            color: #4CAF50;
            margin-top: 0;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 20px;
          }
          th, td {
            border: 1px solid #ddd;
            padding: 8px;
            text-align: left;
          }
          th {
            background-color: #f2f2f2;
          }
          tr:nth-child(even) {
            background-color: #f9f9f9;
          }
          .total-section {
            text-align: right;
            margin-top: 20px;
          }
          .total-row {
            display: flex;
            justify-content: flex-end;
            margin-bottom: 5px;
          }
          .total-row .label {
            width: 150px;
            font-weight: bold;
            text-align: left;
          }
          .total-row .value {
            width: 100px;
            text-align: right;
          }
          .grand-total {
            font-size: 1.2em;
            font-weight: bold;
            color: #4CAF50;
            border-top: 2px solid #4CAF50;
            padding-top: 5px;
          }
          .footer {
            text-align: center;
            margin-top: 30px;
            color: #777;
            font-size: 0.9em;
            border-top: 1px solid #ddd;
            padding-top: 10px;
          }
        </style>
      </head>
      <body>
        <div class="invoice-container">
          <div class="invoice-header">
            <h1>BHOSALE MEDICO</h1>
            <p>Your Health, Our Priority</p>
            <div class="license-info">
              <p>License No: MH-PZ6-595873</p>
            </div>
          </div>
          
          <div class="invoice-details">
            <div class="left">
              <p><strong>Invoice Number:</strong> ${sale.billNumber}</p>
              <p><strong>Date:</strong> ${date}</p>
              <p><strong>Time:</strong> ${time}</p>
            </div>
            <div class="right">
              <p><strong>Payment Method:</strong> ${sale.paymentMethod.toUpperCase()}</p>
            </div>
          </div>
          
          ${customerInfo}
          
          <table>
            <thead>
              <tr>
                <th>No.</th>
                <th>Medicine</th>
                <th>Batch</th>
                <th>Expiry</th>
                <th>Qty</th>
                <th>MRP</th>
                <th>Discount</th>
                <th>Amount</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHTML}
            </tbody>
          </table>
          
          <div class="total-section">
            <div class="total-row">
              <div class="label">Subtotal:</div>
              <div class="value">₹${sale.subtotal.toFixed(2)}</div>
            </div>
            <div class="total-row">
              <div class="label">Discount:</div>
              <div class="value">₹${sale.discount.toFixed(2)}</div>
            </div>
            <div class="total-row">
              <div class="label">Tax (${sale.tax}%):</div>
              <div class="value">₹${((sale.subtotal * sale.tax) / 100).toFixed(
                2
              )}</div>
            </div>
            <div class="total-row grand-total">
              <div class="label">GRAND TOTAL:</div>
              <div class="value">₹${sale.total.toFixed(2)}</div>
            </div>
          </div>
          
          <div class="footer">
            <p>Thank you for your purchase!</p>
            <p>For any queries, please contact us at: +91 9145481414</p>
          </div>
        </div>
      </body>
      </html>
    `;
};

// utils/returnHtmlGenerator.js
export const generateReturnHTML = (returnDoc) => {
  const date = new Date(returnDoc.createdAt).toLocaleDateString("en-IN", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const time = new Date(returnDoc.createdAt).toLocaleTimeString("en-IN");

  let customerInfo = "";
  if (returnDoc.customer) {
    customerInfo = `
        <div class="customer-info">
          <h3>Customer Details</h3>
          <p><strong>Name:</strong> ${returnDoc.customer.name}</p>
          <p><strong>Phone:</strong> ${
            returnDoc.customer.contactNumber || "N/A"
          }</p>
        </div>
      `;
  }

  let originalSaleInfo = "";
  if (returnDoc.originalSale) {
    const originalDate = new Date(
      returnDoc.originalSale.createdAt
    ).toLocaleDateString("en-IN", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    originalSaleInfo = `
        <div class="original-sale-info">
          <h3>Original Sale</h3>
          <p><strong>Bill Number:</strong> ${returnDoc.originalSale.billNumber}</p>
          <p><strong>Date:</strong> ${originalDate}</p>
        </div>
      `;
  }

  let itemsHTML = "";
  returnDoc.items.forEach((item, index) => {
    const medicineName = item.medicine.name;

    itemsHTML += `
        <tr>
          <td>${index + 1}</td>
          <td>${medicineName}</td>
          <td>${item.batchNumber}</td>
          <td>${item.quantity}</td>
          <td>₹${item.mrp.toFixed(2)}</td>
          <td>₹${item.totalAmount.toFixed(2)}</td>
          <td>${item.reason || "Not specified"}</td>
        </tr>
      `;
  });

  return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Return - ${returnDoc.returnNumber}</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            margin: 0;
            padding: 0;
            color: #333;
          }
          .return-container {
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
          }
          .return-header {
            text-align: center;
            margin-bottom: 20px;
            border-bottom: 2px solid #E53935;
            padding-bottom: 10px;
          }
          .return-header h1 {
            color: #E53935;
            margin: 0;
          }
          .return-header p {
            margin: 5px 0;
          }
          .return-details {
            display: flex;
            justify-content: space-between;
            margin-bottom: 20px;
          }
          .return-details .left, .return-details .right {
            flex: 1;
          }
          .customer-info, .original-sale-info {
            margin-bottom: 20px;
            padding: 10px;
            border: 1px solid #ddd;
            border-radius: 5px;
          }
          .customer-info h3, .original-sale-info h3 {
            color: #E53935;
            margin-top: 0;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 20px;
          }
          th, td {
            border: 1px solid #ddd;
            padding: 8px;
            text-align: left;
          }
          th {
            background-color: #f2f2f2;
          }
          tr:nth-child(even) {
            background-color: #f9f9f9;
          }
          .total-section {
            text-align: right;
            margin-top: 20px;
          }
          .grand-total {
            font-size: 1.2em;
            font-weight: bold;
            color: #E53935;
            border-top: 2px solid #E53935;
            padding-top: 5px;
            margin-left: auto;
            width: 250px;
            display: flex;
            justify-content: space-between;
          }
          .footer {
            text-align: center;
            margin-top: 30px;
            color: #777;
            font-size: 0.9em;
            border-top: 1px solid #ddd;
            padding-top: 10px;
          }
        </style>
      </head>
      <body>
        <div class="return-container">
          <div class="return-header">
            <h1>RETURN RECEIPT</h1>
            <p>Your Health, Our Priority</p>
          </div>
          
          <div class="return-details">
            <div class="left">
              <p><strong>Return Number:</strong> ${returnDoc.returnNumber}</p>
              <p><strong>Date:</strong> ${date}</p>
              <p><strong>Time:</strong> ${time}</p>
            </div>
          </div>
          
          ${customerInfo}
          ${originalSaleInfo}
          
          <table>
            <thead>
              <tr>
                <th>No.</th>
                <th>Medicine</th>
                <th>Batch</th>
                <th>Qty</th>
                <th>MRP</th>
                <th>Amount</th>
                <th>Reason</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHTML}
            </tbody>
          </table>
          
          <div class="total-section">
            <div class="grand-total">
              <span>TOTAL RETURN AMOUNT:</span>
              <span>₹${returnDoc.totalAmount.toFixed(2)}</span>
            </div>
          </div>
          
          <div class="footer">
            <p>Thank you for your understanding!</p>
            <p>For any queries, please contact us at: pharmacy@example.com | +91 123-456-7890</p>
          </div>
        </div>
      </body>
      </html>
    `;
};
