# Security Policy

## Supported Versions

We currently support the following versions of the Kaltura-Discord Integration with security updates:

| Version | Supported          |
| ------- | ------------------ |
| 1.0.x   | :white_check_mark: |

## Reporting a Vulnerability

We take the security of the Kaltura-Discord Integration seriously. If you believe you've found a security vulnerability, please follow these steps:

1. **Do not disclose the vulnerability publicly**
2. **Email the maintainers** with details about the vulnerability
   - Provide a clear description of the issue
   - Include steps to reproduce the vulnerability
   - Describe the potential impact
   - If possible, suggest a fix or mitigation
3. **Allow time for response and resolution**
   - You should receive an initial response within 48 hours acknowledging receipt
   - The maintainers will work with you to understand and address the issue
   - A timeline for resolution will be provided based on severity

## Security Best Practices

When deploying the Kaltura-Discord Integration, please follow these security best practices:

1. **Environment Variables**
   - Never commit `.env` files containing real credentials to version control
   - Use a secure method for managing secrets in production (e.g., HashiCorp Vault, AWS Secrets Manager)
   - Rotate secrets regularly

2. **API Access**
   - Use the principle of least privilege when configuring Discord bot permissions
   - Regularly audit and rotate API keys and tokens
   - Use separate API keys for development and production environments

3. **Server Configuration**
   - Keep your Node.js and npm versions up to date
   - Run the application with a dedicated user with minimal permissions
   - Use HTTPS for all API endpoints
   - Configure proper CORS settings

4. **Dependency Management**
   - Regularly update dependencies to address security vulnerabilities
   - Use `npm audit` to check for known vulnerabilities in dependencies
   - Consider using a dependency scanning tool in your CI/CD pipeline

## Security Updates

Security updates will be released as patch versions (e.g., 1.0.1, 1.0.2) and announced through:

1. GitHub releases
2. CHANGELOG.md updates
3. Security advisories for critical issues

We recommend subscribing to GitHub notifications for releases to stay informed about security updates.

## Responsible Disclosure

We appreciate the work of security researchers who help keep our project secure. We are committed to:

- Acknowledging receipt of vulnerability reports in a timely manner
- Verifying and reproducing reported issues
- Addressing confirmed vulnerabilities promptly
- Providing credit to researchers who report valid security issues (if desired)
- Maintaining transparency with our users about security issues (without exposing sensitive details)

Thank you for helping to keep the Kaltura-Discord Integration and its users safe!