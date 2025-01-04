# @aesop-fables/scrinium

`scrinium` is a fully observable data projection/mutation layer for react, built on top of rxjs.

## Installation
```
npm install @aesop-fables/scrinium
```
```
yarn add @aesop-fables/scrinium
```

## Example
You'll find a sample-web application built with create-react-app in the `examples` dir. 

Note:
Make sure that you run `yarn build` in the root repo directory first. 



## Documentation Outline
1. Overview
  a. Local caching layer
  b. Command/Query Separation
2. Compartments
3. Data Caches
  a. Creating a cache
  b. Consuming data
  c. Loading strategies
  d. Retention
4. Repositories
5. Subjects
6. Queries
7. Commands
8. Hooks
  a. useSubject
  b. useObservableQuery
  c. useCommands
  d. useSubjectResolver
  e. useBusy
  f. useApplicationState
  g. useConstant
  h. useListener
  i. useObservable
  j. useProjection ?
  k. useMutation ?
9. Advanced Usage