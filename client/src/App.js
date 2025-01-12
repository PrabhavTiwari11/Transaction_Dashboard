// import logo from './logo.svg';
// import './App.css';

// function App() {
//   return (
//     <div className="App">
//       <header className="App-header">
//         <img src={logo} className="App-logo" alt="logo" />
//         <p>
//           Edit <code>src/App.js</code> and save to reload.
//         </p>
//         <a
//           className="App-link"
//           href="https://reactjs.org"
//           target="_blank"
//           rel="noopener noreferrer"
//         >
//           Learn React
//         </a>
//       </header>
//     </div>
//   );
// }

// export default App;
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Bar, Pie } from 'react-chartjs-2';

const App = () => {
    const [transactions, setTransactions] = useState([]);
    const [statistics, setStatistics] = useState({});
    const [barChartData, setBarChartData] = useState([]);
    const [pieChartData, setPieChartData] = useState([]);
    const [month, setMonth] = useState('3'); // Default to March
    const [search, setSearch] = useState('');
    const [page, setPage] = useState(1);
    const [total, setTotal] = useState(0);

    useEffect(() => {
        fetchData();
    }, [month, page]);

    const fetchData = async () => {
        const transactionsResponse = await axios.get(`/api/transactions?month=${month}&page=${page}&search=${search}`);
        const statisticsResponse = await axios.get(`/api/statistics?month=${month}`);
        const barChartResponse = await axios.get(`/api/bar-chart?month=${month}`);
        const pieChartResponse = await axios.get(`/api/pie-chart?month=${month}`);

        setTransactions(transactionsResponse.data.transactions);
        setTotal(transactionsResponse.data.total);
        setStatistics(statisticsResponse.data);
        setBarChartData(barChartResponse.data);
        setPieChartData(pieChartResponse.data);
    };

    const handleSearch = (e) => {
        setSearch(e.target.value);
        setPage(1); // Reset to first page on new search
    };

    const handleMonthChange = (e) => {
        setMonth(e.target.value);
        setPage(1); // Reset to first page on month change
    };

    const handleNextPage = () => {
        if (page < Math.ceil(total / 10)) {
            setPage(page + 1);
        }
    };

    const handlePreviousPage = () => {
        if (page > 1) {
            setPage(page - 1);
        }
    };

    return (
        <div>
            <h1>Transaction Dashboard</h1>
            <div>
                <label>Select Month:</label>
                <select value={month} onChange={handleMonthChange}>
                    {Array.from({ length: 12 }, (_, i) => (
                        <option key={i} value={i + 1}>{new Date(0, i).toLocaleString('default', { month: 'long' })}</option>
                    ))}
                </select>
                <input
                    type="text"
                    placeholder="Search by Title/Description/Price"
                    value={search}
                    onChange={handleSearch}
                />
            </div>
            <table>
                <thead>
                    <tr>
                        <th>Transaction ID</th>
                        <th>Product Title</th>
                        <th>Description</th>
                        <th>Price</th>
                        <th>Date of Sale</th>
                    </tr>
                </thead>
                <tbody>
                    {transactions.map(transaction => (
                        <tr key={transaction._id}>
                            <td>{transaction._id}</td>
                            <td>{transaction.title}</td>
                            <td>{transaction.description}</td>
                            <td>{transaction.price}</td>
                            <td>{new Date(transaction.dateOfSale).toLocaleDateString()}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
            <div>
                <button onClick={handlePreviousPage} disabled={page === 1}>Previous</button>
                <span>Page {page}</span>
                <button onClick={handleNextPage} disabled={page >= Math.ceil(total / 10)}>Next</button>
            </div>
            <div>
                <h2>Statistics</h2>
                <p>Total Sale Amount: {statistics.totalSaleAmount}</p>
                <p>Total Sold Items: {statistics.totalSoldItems}</p>
                <p>Total Not Sold Items: {statistics.totalNotSoldItems}</p>
            </div>
            <div>
                <h2>Bar Chart</h2>
                <Bar
                    data={{
                        labels: barChartData.map(item => item._id),
                        datasets: [{
                            label: 'Number of Items',
                            data: barChartData.map(item => item.count),
                            backgroundColor: 'rgba(75, 192, 192, 0.6)',
                        }]
                    }}
                />
            </div>
            <div>
                <h2>Pie Chart</h2>
                <Pie
                    data={{
                        labels: pieChartData.map(item => item._id),
                        datasets: [{
                            data: pieChartData.map(item => item.count),
                            backgroundColor: ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF'],
                        }]
                    }}
                />
            </div>
        </div>
    );
};

export default App;