describe('DSHttpAdapter.updateAll(resourceConfig, attrs, params, options)', function () {

  beforeEach(startInjector);

  it('should make a PUT request', function () {
    $httpBackend.expectPUT('api/posts').respond(200, [p1]);

    DSHttpAdapter.updateAll({
      baseUrl: 'api',
      endpoint: 'posts',
      getEndpoint: function () {
        return 'posts';
      }
    }, { author: 'John', age: 30 }).then(function (data) {
      assert.deepEqual(data.data, [p1], 'posts should have been updated');
    }, function (err) {
      console.error(err.stack);
      fail('should not have rejected');
    });

    $httpBackend.flush();

    $httpBackend.expectPUT('api2/posts?where=%7B%22author%22:%7B%22%3D%3D%22:%22John%22%7D%7D').respond(200, [p1]);

    DSHttpAdapter.updateAll({
      baseUrl: 'api',
      endpoint: 'posts',
      getEndpoint: function () {
        return 'posts';
      }
    }, { author: 'John', age: 30 }, {
      where: {
        author: {
          '==': 'John'
        }
      }
    }, { baseUrl: 'api2' }).then(function (data) {
      assert.deepEqual(data.data, [p1], 'posts should have been updated');
    }, function (err) {
      console.error(err.stack);
      fail('should not have rejected');
    });

    $httpBackend.flush();

    assert.equal(lifecycle.queryTransform.callCount, 1, 'queryTransform should have been called');
  });
});
