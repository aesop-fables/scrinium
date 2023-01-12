# Data Projections 

Documentation coming...


## Cache types:

1. DataCache
   1. Strongly-typed data-compartments with lazy loading/custom resolvers
2. LazyCache
   1. Strongly typed in-memory cache (just get/sets) 
   2. The LazyObservable stuff lives over here too
3. Cache
   1. This is something more like react-query's useQuery hook


createDataCache<T>()

```typescript
createCache<T>({
  [keyof T]: compartmentFor<Something>({
    
  })
});
```