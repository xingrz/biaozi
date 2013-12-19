define(function (require, exports, module) {
  var App = Ember.Application.create()

  App.ApplicationView = Ember.View.extend({
    templateName: 'application'
  })

  App.ApplicationController = Ember.Controller.extend()

  App.AllContributorsController = Ember.ArrayController.extend()

  App.AllContributorsView = Ember.View.extend({
    templateName: 'contributors'
  })

  App.Router = Ember.Router.extend({
    root: Ember.Route.extend({
      index: Ember.Route.extend({
        route: '/'
      , connectOutlets: function (router) {
          router.get('applicationController').connectOutlet('allContributors', [
            { login: 'hahahaha' }
          , { login: 'asdfasdf' }
          ])
        }
      })
    })
  })
})
