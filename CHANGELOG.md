# Changelog
All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.3.0] - 2021-02-21
### Added
- A bar chart showing annual returns vs benchmark
- Ulcer index
- Pie chart under 'Portfolio' tab that shows the percent of time spent in each asset
- Support for multiple holdings in a single time period
- Transactions report showing all transactions
- Add suggested parameters drop-down for strategies

### Changed
- Reverse legend on monthly returns chart

### Fixed
- Error when displaying simulations with no drawdowns
- Additional error checking when benchmark is undefined

## [0.2.1] - 2021-02-15
### Fixed
- Parsing of dates from date widget

## [0.2.0] - 2021-02-14
### Added
- Monthly return heatmap chart on strategy performance summary tab
- Display investment value in portfolio tab
- Ability to download portfolio as a CSV
- Toggle to show log scale on return chart
- Add max draw down to summary page and option to plot draw downs on chart
- Add tables for CAGR, portfolio metrics, and risk metrics to summary view
- Add benchmark comparison

### Changed
- Datepicker now supports quick shortcuts and easier navigation between years
- Adjust precision on Portfolio Cards to match what is displayed in Summary page

### Fixed
- Change Vue.js mode to use hash tags so refresh does not get 404's

## [0.1.0] - 2021-02-08
### Added
- Strategy card view
- Portfolio card view
- Strategy info page with statistics for return over time and portfolio transactions
- Portfolio info page with statistics for return over time and portfolio transactions
- Terms of Service
- Privacy Policy

[0.3.0]: https://github.com/jdfergason/pv-frontend/releases/tag/v0.3.0
[0.2.1]: https://github.com/jdfergason/pv-frontend/releases/tag/v0.2.1
[0.2.0]: https://github.com/jdfergason/pv-frontend/releases/tag/v0.2.0
[0.1.0]: https://github.com/jdfergason/pv-frontend/releases/tag/v0.1.0
