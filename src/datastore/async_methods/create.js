function errorPrefix(resourceName) {
  return 'DS.create(' + resourceName + ', attrs[, options]): ';
}

/**
 * @doc method
 * @id DS.async methods:create
 * @name create
 * @description
 * The "C" in "CRUD". Delegate to the `create` method of whichever adapter is being used (http by default) and inject the
 * result into the data store.
 *
 * ## Signature:
 * ```js
 * DS.create(resourceName, attrs[, options])
 * ```
 *
 * ## Example:
 *
 * ```js
 * DS.create('document', {
 *   author: 'John Anderson'
 * }).then(function (document) {
 *   document; // { id: 5, author: 'John Anderson' }
 *
 *   // The new document is already in the data store
 *   DS.get('document', document.id); // { id: 5, author: 'John Anderson' }
 * });
 * ```
 *
 * @param {string} resourceName The resource type, e.g. 'user', 'comment', etc.
 * @param {object} attrs The attributes with which to create the item of the type specified by `resourceName`.
 * @param {object=} options Configuration options. Also passed along to the adapter's `create` method. Properties:
 *
 * - `{boolean=}` - `useClass` - Whether to wrap the injected item with the resource's instance constructor.
 * - `{boolean=}` - `cacheResponse` - Inject the data returned by the adapter into the data store. Default: `true`.
 * - `{boolean=}` - `upsert` - If `attrs` already contains a primary key, then attempt to call `DS.update` instead. Default: `true`.
 * - `{function=}` - `beforeValidate` - Override the resource or global lifecycle hook.
 * - `{function=}` - `validate` - Override the resource or global lifecycle hook.
 * - `{function=}` - `afterValidate` - Override the resource or global lifecycle hook.
 * - `{function=}` - `beforeCreate` - Override the resource or global lifecycle hook.
 * - `{function=}` - `afterCreate` - Override the resource or global lifecycle hook.
 *
 * @returns {Promise} Promise produced by the `$q` service.
 *
 * ## Resolves with:
 *
 * - `{object}` - `item` - A reference to the newly created item.
 *
 * ## Rejects with:
 *
 * - `{IllegalArgumentError}`
 * - `{NonexistentResourceError}`
 */
function create(resourceName, attrs, options) {
  var DS = this;
  var deferred = DS.$q.defer();

  try {
    var definition = DS.definitions[resourceName];

    options = options || {};

    if (!definition) {
      throw new DS.errors.NER(errorPrefix(resourceName) + resourceName);
    } else if (!DS.utils.isObject(attrs)) {
      throw new DS.errors.IA(errorPrefix(resourceName) + 'attrs: Must be an object!');
    }
    if (!('cacheResponse' in options)) {
      options.cacheResponse = true;
    }

    if (!('upsert' in options)) {
      options.upsert = true;
    }

    deferred.resolve(attrs);

    if (options.upsert && attrs[definition.idAttribute]) {
      return DS.update(resourceName, attrs[definition.idAttribute], attrs, options);
    } else {
      return deferred.promise
        .then(function (attrs) {
          var func = options.beforeValidate ? DS.$q.promisify(options.beforeValidate) : definition.beforeValidate;
          return func.call(attrs, resourceName, attrs);
        })
        .then(function (attrs) {
          var func = options.validate ? DS.$q.promisify(options.validate) : definition.validate;
          return func.call(attrs, resourceName, attrs);
        })
        .then(function (attrs) {
          var func = options.afterValidate ? DS.$q.promisify(options.afterValidate) : definition.afterValidate;
          return func.call(attrs, resourceName, attrs);
        })
        .then(function (attrs) {
          var func = options.beforeCreate ? DS.$q.promisify(options.beforeCreate) : definition.beforeCreate;
          return func.call(attrs, resourceName, attrs);
        })
        .then(function (attrs) {
          DS.notify(definition, 'beforeCreate', DS.utils.merge({}, attrs));
          return DS.adapters[options.adapter || definition.defaultAdapter].create(definition, options.serialize ? options.serialize(resourceName, attrs) : definition.serialize(resourceName, attrs), options);
        })
        .then(function (res) {
          var func = options.afterCreate ? DS.$q.promisify(options.afterCreate) : definition.afterCreate;
          var attrs = options.deserialize ? options.deserialize(resourceName, res) : definition.deserialize(resourceName, res);
          return func.call(attrs, resourceName, attrs);
        })
        .then(function (attrs) {
          DS.notify(definition, 'afterCreate', DS.utils.merge({}, attrs));
          if (options.cacheResponse) {
            var resource = DS.store[resourceName];
            var created = DS.inject(definition.name, attrs, options);
            var id = created[definition.idAttribute];
            resource.completedQueries[id] = new Date().getTime();
            resource.previousAttributes[id] = DS.utils.deepMixIn({}, created);
            resource.saved[id] = DS.utils.updateTimestamp(resource.saved[id]);
            return DS.get(definition.name, id);
          } else {
            return DS.createInstance(resourceName, attrs, options);
          }
        });
    }
  } catch (err) {
    deferred.reject(err);
    return deferred.promise;
  }
}

module.exports = create;
