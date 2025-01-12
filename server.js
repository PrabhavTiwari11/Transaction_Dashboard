const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const axios = require('axios');

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 5000;

// MongoDB connection
mongoose.connect('mongodb://localhost:27017/transactions', { useNewUrlParser: true, useUnifiedTopology: true });

// Transaction Schema
const transactionSchema = new mongoose.Schema({
    title: String,
    description: String,
    price: Number,
    dateOfSale: Date,
    category: String
});

const Transaction = mongoose.model('Transaction', transactionSchema);

// API to initialize the database
app.get('/api/init', async (req, res) => {
    try {
        const response = await axios.get('https://s3.amazonaws.com/roxiler.com/product_transaction.json');
        const transactions = response.data;

        await Transaction.deleteMany({});
        await Transaction.insertMany(transactions);
        res.status(200).send('Database initialized with seed data');
    } catch (error) {
        res.status(500).send('Error initializing database');
    }
});

// API to list all transactions with search and pagination
app.get('/api/transactions', async (req, res) => {
    const { month, page = 1, perPage = 10, search = '' } = req.query;
    const startDate = new Date(`2023-${month}-01`);
    const endDate = new Date(`2023-${month + 1}-01`);

    const query = {
        dateOfSale: { $gte: startDate, $lt: endDate },
        $or: [
            { title: { $regex: search, $options: 'i' } },
            { description: { $regex: search, $options: 'i' } },
            { price: { $regex: search, $options: 'i' } }
        ]
    };

    const transactions = await Transaction.find(query)
        .skip((page - 1) * perPage)
        .limit(perPage);
    const total = await Transaction.countDocuments(query);

    res.json({ transactions, total });
});

// API for statistics
app.get('/api/statistics', async (req, res) => {
    const { month } = req.query;
    const startDate = new Date(`2023-${month}-01`);
    const endDate = new Date(`2023-${month + 1}-01`);

    const totalSales = await Transaction.aggregate([
        { $match: { dateOfSale: { $gte: startDate, $lt: endDate } } },
        { $group: { _id: null, total: { $sum: '$price' }, count: { $sum: 1 } } }
    ]);

    const totalSoldItems = totalSales[0]?.count || 0;
    const totalNotSoldItems = await Transaction.countDocuments({ dateOfSale: { $lt: startDate } });

    res.json({
        totalSaleAmount: totalSales[0]?.total || 0,
        totalSoldItems,
        totalNotSoldItems
    });
});

// API for bar chart data
app.get('/api/bar-chart', async (req, res) => {
    const { month } = req.query;
    const startDate = new Date(`2023-${month}-01`);
    const endDate = new Date(`2023-${month + 1}-01`);

    const priceRanges = [
        { $match: { dateOfSale: { $gte: startDate, $lt: endDate } } },
        { $bucket: {
            groupBy: "$price",
            boundaries: [0, 100, 200, 300, 400, 500, 600, 700, 800, 900, Infinity],
            default: "901-above",
            output: { count: { $sum: 1 } }
        }}
    ];

    const data = await Transaction.aggregate(priceRanges);
    res.json(data);
});

// API for pie chart data
app.get('/api/pie-chart', async (req, res) => {
    const { month } = req.query;
    const startDate = new Date(`2023-${month}-01`);
    const endDate = new Date(`2023-${month + 1}-01`);

    const categories = await Transaction.aggregate([
        { $match: { dateOfSale: { $gte: startDate, lt: endDate } } },
        { $group: { _id: "$category", count: { $sum: 1 } } }
    ]);

    res.json(categories);
});

// API to fetch combined data
app.get('/api/combined', async (req, res) => {
    const { month } = req.query;
    const transactions = await Transaction.find({ dateOfSale: { $gte: new Date(`2023-${month}-01`), $lt: new Date(`2023-${month + 1}-01`) } });
    const statistics = await getStatistics(month);
    const barChartData = await getBarChartData(month);
    const pieChartData = await getPieChartData(month);

    res.json({ transactions, statistics, barChartData, pieChartData });
});

// Helper functions for statistics, bar chart, and pie chart
async function getStatistics(month) {
    const startDate = new Date(`2023-${month}-01`);
    const endDate = new Date(`2023-${month + 1}-01`);
    const totalSales = await Transaction.aggregate([
        { $match: { dateOfSale: { $gte: startDate, $lt: endDate } } },
        { $group: { _id: null, total: { $sum: '$price' }, count: { $sum: 1 } } }
    ]);
    const totalSoldItems = totalSales[0]?.count || 0;
    const totalNotSoldItems = await Transaction.countDocuments({ dateOfSale: { $lt: startDate } });
    return { totalSaleAmount: totalSales[0]?.total || 0, totalSoldItems, totalNotSoldItems };
}

async function getBarChartData(month) {
    const startDate = new Date(`2023-${month}-01`);
    const endDate = new Date(`2023-${month + 1}-01`);
    return await Transaction.aggregate([
        { $match: { dateOfSale: { $gte: startDate, $lt: endDate } } },
        { $bucket: {
            groupBy: "$price",
            boundaries: [0, 100, 200, 300, 400, 500, 600, 700, 800, 900, Infinity],
            default: "901-above",
            output: { count: { $sum: 1 } }
        }}
    ]);
}

async function getPieChartData(month) {
    const startDate = new Date(`2023-${month}-01`);
    const endDate = new Date(`2023-${month + 1}-01`);
    return await Transaction.aggregate([
        { $match: { dateOfSale: { $gte: startDate, $lt: endDate } } },
        { $group: { _id: "$category", count: { $sum: 1 } } }
    ]);
}

// Start the server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});