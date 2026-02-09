const winston = require('winston');
const CloudWatchTransport = require('winston-cloudwatch');

const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

const transports = [
  // Console logging (for Docker logs)
  new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple()
    )
  })
];

// Add CloudWatch only in production
if (process.env.NODE_ENV === 'production' && process.env.AWS_REGION) {
  transports.push(
    new CloudWatchTransport({
      logGroupName: '/aws/ec2/habit-tracker',
      logStreamName: `api-${new Date().toISOString().split('T')[0]}`,
      awsRegion: process.env.AWS_REGION,
      jsonMessage: true,
      messageFormatter: ({ level, message, ...meta }) => {
        return JSON.stringify({ level, message, ...meta });
      }
    })
  );
}

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: logFormat,
  transports,
  exitOnError: false
});

module.exports = logger;
