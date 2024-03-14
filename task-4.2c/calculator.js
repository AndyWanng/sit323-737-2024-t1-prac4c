const express = require('express');
const winston = require('winston');
const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Logger configuration
const logger = winston.createLogger({
    level: 'info',
    format: winston.format.combine(
        winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        winston.format.printf(info => `${info.timestamp} ${info.level.toUpperCase()}: ${info.message}`)
    ),
    defaultMeta: { service: 'calculator-microservice' },
    transports: [
        new winston.transports.Console(),
        new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
        new winston.transports.File({ filename: 'logs/combined.log' })
    ],
});

// Welcome route
app.get('/', (req, res) => {
    res.status(200).send("Welcome to the Calculator Microservice. Use /add, /subtract, /multiply, /divide, /exponent, /sqrt, /modulo, /abs, /remainder with ?num1=number&num2=number");
});

// Arithmetic operations as reusable functions
const operations = {
    add: (num1, num2) => num1 + num2,
    subtract: (num1, num2) => num1 - num2,
    multiply: (num1, num2) => num1 * num2,
    divide: (num1, num2) => {
        if (num2 === 0) throw new Error("Cannot divide by zero.");
        return num1 / num2;
    },
    exponent: (num1, num2) => Math.pow(num1, num2),
    sqrt: (num1) => {
        if (num1 < 0) throw new Error("Cannot find the square root of a negative number.");
        return Math.sqrt(num1);
    },
    modulo: (num1, num2) => num1 % num2,
    abs: (num1) => Math.abs(num1),
    remainder: (num1, num2) => num1 % num2
};

// Validating input parameters
const validateInput = (req, res, next) => {
    const { num1, num2 } = req.query;
    if (isNaN(num1) || (isNaN(num2) && !['sqrt', 'abs'].includes(req.params.operation))) {
        logger.error(`Invalid input: num1=${num1}, num2=${num2}, operation=${req.params.operation}`);
        return res.status(400).json({ statuscode: 400, msg: "Invalid input: Both num1 and num2 must be valid numbers, except for sqrt and abs operations which require only num1." });
    }
    req.num1 = parseFloat(num1);
    if (!['sqrt', 'abs'].includes(req.params.operation)) {
        req.num2 = parseFloat(num2);
    }
    next();
};

// Arithmetic operations endpoint
app.get("/:operation", validateInput, (req, res, next) => {
    try {
        const { operation } = req.params;
        const { num1, num2 } = req;
        if (!(operation in operations)) {
            logger.error(`Operation not found: ${operation}`);
            return res.status(404).json({ statuscode: 404, msg: "Operation not found. Use add, subtract, multiply, divide, exponent, sqrt, modulo, abs, or remainder." });
        }
        const result = ['sqrt', 'abs'].includes(operation) ? operations[operation](num1) : operations[operation](num1, num2);
        logger.info(`Operation ${operation} successful on num1=${num1}, num2=${num2}, Result=${result}`);
        res.status(200).json({ statuscode: 200, data: result });
    } catch (error) {
        next(error);
    }
});

// Enhanced error handling
app.use((err, req, res, next) => {
    logger.error(`Error occurred: ${err.message}`);
    if (err.message.includes("divide by zero") || err.message.includes("negative number")) {
        return res.status(400).json({ statuscode: 400, msg: err.message });
    }
    res.status(500).json({ statuscode: 500, msg: "An unexpected error occurred." });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => logger.info(`Server running on port ${PORT}`));
