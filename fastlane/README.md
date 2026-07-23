fastlane documentation
----

# Installation

Make sure you have the latest version of the Xcode command line tools installed:

```sh
xcode-select --install
```

For _fastlane_ installation instructions, see [Installing _fastlane_](https://docs.fastlane.tools/#installing-fastlane)

# Available Actions

## iOS

### ios bootstrap

```sh
[bundle exec] fastlane ios bootstrap
```

Register the bundle id + app record via the API key (fast, no build)

### ios beta

```sh
[bundle exec] fastlane ios beta
```

Build the iOS shell and upload to TestFlight (internal testing, no review)

### ios status

```sh
[bundle exec] fastlane ios status
```

Report the live TestFlight build + tester status

### ios distribute

```sh
[bundle exec] fastlane ios distribute
```

Make the latest build testable: answer export compliance, create the internal group, add the account holder

### ios external

```sh
[bundle exec] fastlane ios external
```

Create an external group with a public TestFlight link and attach the latest build

----

This README.md is auto-generated and will be re-generated every time [_fastlane_](https://fastlane.tools) is run.

More information about _fastlane_ can be found on [fastlane.tools](https://fastlane.tools).

The documentation of _fastlane_ can be found on [docs.fastlane.tools](https://docs.fastlane.tools).
