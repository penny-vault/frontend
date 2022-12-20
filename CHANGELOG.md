# Changelog
All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.5.0] - 2022-12-20
### Added
- Stock selection component
- Clearer display of draw downs when the current draw down is still going on

### Changed

### Deprecated

### Removed

### Fixed
- Top-10 draw downs rendering on performance chart

### Security

## [0.4.0] - 2022-08-11
### Added
- Scatter plot comparing performance vs risk of all strategies
- Holdings detail chart
- Holdings calculator that calculates number of shares based on arbitrate portfolio balance
- TradingView ticker tape widget
- Per column search for most datatables

### Changed
- Updated to vue3
- Switched frontend framework from bootstrap to quasar.dev
- Switched charting library from highcharts to amcharts for better animation support
- Refreshed design to work better on mobile devices
- Updated to work with pv-api 0.4.0

## [0.3.0] - 2021-02-21
### Added
- Justification for portfolio changes
- Predicted holdings for next month in strategy simulations
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

[0.5.0]: https://github.com/penny-vault/frontend/releases/tag/v0.5.0
[0.4.0]: https://github.com/penny-vault/frontend/releases/tag/v0.4.0
[0.3.0]: https://github.com/penny-vault/frontend/releases/tag/v0.3.0
[0.2.1]: https://github.com/penny-vault/frontend/releases/tag/v0.2.1
[0.2.0]: https://github.com/penny-vault/frontend/releases/tag/v0.2.0
[0.1.0]: https://github.com/penny-vault/frontend/releases/tag/v0.1.0
