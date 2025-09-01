# Contributing to APT Casino

Thank you for your interest in contributing to APT Casino! This document provides guidelines and information for contributors.

## 🤝 How to Contribute

### Types of Contributions
We welcome various types of contributions:
- **Bug Reports**: Report bugs and issues
- **Feature Requests**: Suggest new features
- **Code Contributions**: Submit pull requests
- **Documentation**: Improve documentation
- **Testing**: Help with testing and quality assurance
- **Community Support**: Help other users

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ and npm/yarn
- Git
- Basic knowledge of React, Next.js, and blockchain development

### Setup Development Environment
1. Fork the repository
2. Clone your fork: `git clone https://github.com/YOUR_USERNAME/apt-casino-motoko.git`
3. Install dependencies: `npm install`
4. Create a feature branch: `git checkout -b feature/your-feature-name`

## 📝 Development Guidelines

### Code Style
- Follow existing code formatting and style
- Use meaningful variable and function names
- Add comments for complex logic
- Keep functions small and focused
- Use TypeScript for type safety

### Commit Messages
Follow conventional commit format:
```
type(scope): description

feat(game): add new betting option to roulette
fix(ui): resolve mobile responsiveness issue
docs(readme): update installation instructions
```

### Pull Request Process
1. Ensure your code follows the project's style guidelines
2. Add tests for new functionality
3. Update documentation if needed
4. Provide a clear description of changes
5. Reference any related issues

## 🎮 Game Development

### Adding New Games
1. Create game contract (Move for Aptos, Motoko for ICP)
2. Implement game logic and state management
3. Create frontend components
4. Add game configuration
5. Update documentation

### Game Requirements
- Provably fair randomness
- Proper error handling
- Event logging
- Security validation
- Mobile responsiveness

## 🔐 Security Guidelines

### Smart Contract Security
- All contracts must be audited
- Implement proper access controls
- Use secure random number generation
- Validate all inputs
- Handle edge cases properly

### Frontend Security
- Validate user inputs
- Implement proper authentication
- Secure API endpoints
- Use HTTPS in production
- Regular security updates

## 🧪 Testing

### Testing Requirements
- Unit tests for all functions
- Integration tests for game flows
- End-to-end tests for user journeys
- Performance testing for scalability
- Security testing for vulnerabilities

### Running Tests
```bash
# Run all tests
npm test

# Run specific test suites
npm run test:unit
npm run test:integration
npm run test:e2e
```

## 📚 Documentation

### Documentation Standards
- Clear and concise writing
- Code examples where appropriate
- Screenshots for UI changes
- API documentation for new endpoints
- Update README for major changes

### Required Documentation
- README.md with setup instructions
- API documentation
- Deployment guides
- Contributing guidelines
- Code of conduct

## 🐛 Bug Reports

### Bug Report Template
```
**Description**: Brief description of the issue

**Steps to Reproduce**:
1. Step 1
2. Step 2
3. Step 3

**Expected Behavior**: What should happen

**Actual Behavior**: What actually happens

**Environment**:
- OS: [e.g., macOS, Windows, Linux]
- Browser: [e.g., Chrome, Firefox, Safari]
- Version: [e.g., 1.0.0]

**Additional Information**: Any other relevant details
```

## 💡 Feature Requests

### Feature Request Template
```
**Description**: Brief description of the feature

**Use Case**: Why this feature would be useful

**Proposed Solution**: How you think it should work

**Alternatives Considered**: Other approaches you considered

**Additional Information**: Any other relevant details
```

## 🔄 Release Process

### Release Checklist
- [ ] All tests passing
- [ ] Documentation updated
- [ ] Security audit completed
- [ ] Performance benchmarks met
- [ ] Mobile compatibility verified
- [ ] Browser compatibility tested

### Versioning
We follow semantic versioning:
- **Major**: Breaking changes
- **Minor**: New features, backward compatible
- **Patch**: Bug fixes, backward compatible

## 📞 Getting Help

### Communication Channels
- **GitHub Issues**: For bugs and feature requests
- **GitHub Discussions**: For questions and discussions
- **Pull Requests**: For code contributions
- **Email**: For security issues

### Response Time
- Bug reports: Within 48 hours
- Feature requests: Within 1 week
- Pull requests: Within 1 week
- Security issues: Within 24 hours

## 📄 License

By contributing to APT Casino, you agree that your contributions will be licensed under the MIT License.

## 🙏 Recognition

Contributors will be recognized in:
- README.md contributors section
- Release notes
- Project documentation
- Community announcements

Thank you for contributing to APT Casino! 🎉
