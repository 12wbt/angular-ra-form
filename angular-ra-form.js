'use strict';
// Source: src/angular-ra-form.js
angular.module('ra.form', []);

// Source: src/directives/error.js
angular.module('ra.form').

    directive('errorFor', function() {
    return {
      restrict:   'A',
      replace:    true,
      scope:      true,
      template:   '<p class="form-error" ng-show="errors.length > 0" ng-transclude></p>',
      transclude: true,
      controller: function($scope, $element, $attrs) {
        $scope.errors = [];

        this.show = function(type) {
          if (!_.contains($scope.errors, type)) {
            $scope.errors.push(type);
          }
        };

        this.hide = function(type) {
          $scope.errors = _.reject($scope.errors, type);
        };

        this.name = $attrs.errorFor;
      }
    };
  }).

  directive('errorOn', function() {
    return {
      require:    ['^form', '?^errorFor'],
      restrict:   'A',
      replace:    true,
      scope:      true,
      template:   '<span class="text-danger" ng-show="show_error" ng-transclude></span>',
      transclude: true,
      link: function($scope, element, attr, controller) {
        var form      = controller[0],
            error_for = controller[1];

        var field, type;

        if (error_for) {
          field = error_for.name;
          type  = attr.errorOn;
        } else {
          var validation_exp = attr.errorOn.split(',');

          field = _.str.trim(validation_exp[0]);
          type  = _.str.trim(validation_exp[1]);
        }

        var hasError = function() {
          var has_error = $scope[form.$name] &&
                          $scope[form.$name][field] &&
                          $scope[form.$name][field].$error[type];

          return has_error;
        };

        $scope.$watch(form.$name + '.' + field + '.show_errors', function(show_errors) {
          if (show_errors && hasError()) {
            $scope.show_error = true;

            if (error_for) {
              error_for.show(type);
            }
          } else {
            $scope.show_error = false;

            if (error_for) {
              error_for.hide(type);
            }
          }
        });
      }
    };
  });

// Source: src/directives/ra-form.js
angular.module('ra.form').

  directive('raForm', function(raForm) {
    return {
      restrict: 'A',
      require:  'form',
      link: function($scope, element, attr, controller) {
        var actions = $scope[attr.raForm];

        // Make sure an update callback is passed
        if (_.isUndefined(actions) || _.isFunction(actions.update) === false) {
          throw new Error(
            'You must provide an update callback. e.g. <form ra-form="form_events">,' +
            'where $scope.form_events = { update: callbackFn }'
          );
        }

        $scope[controller.$name] = _.extend($scope[controller.$name], raForm.actions, actions);
      }
    };
  });

// Source: src/directives/validate-on.js
angular.module('ra.form').

  directive('validateOn', function() {
    return {
      require: ['^form', 'ngModel'],
      restrict: 'A',
      link: function($scope, element, attr, controller) {
        var formController  = controller[0],
            modelController = controller[1];

        var init = function() {
          if (attr.validateOn === 'blur') {
            watchBlur();
          }

          else if (attr.validateOn === 'submit') {
            watchSubmit();
          }
        };


        var watchBlur = function() {
          _.each('focus blur'.split(' '), function(event) {
            element.on(event, function() {
              $scope.$apply(function() {
                formController[event](modelController.$name);
              });
            });
          });
        };


        var watchSubmit = function() {
          formController.onSubmit(function() {
            formController.blur(modelController.$name);
          });
        };


        var dereg = $scope.$watch(function() { return formController.initialized; }, function(value) {
          dereg();
          init();
        });
      }
    };
  });

// Source: src/services/ra-form.js
angular.module('ra.form').

  factory('raForm', function() {
    return {
      actions: {
        initialized: true,
        submitting: false,
        submitCallbacks: [],

        showErrors: function(field) {
          if (field && this[field]) {
            this[field].show_errors = true;
          }
        },

        hideErrors: function(field) {
          if (field && this[field]) {
            this[field].show_errors = false;
          }
        },

        showErrorsOnInValid: function(field) {
          var $this = this;

          _.each($this.$error, function(errors, type) {
            _.each(errors, function(error) {
              $this.showErrors(error.$name);
            });
          });
        },

        setValidity: function(field, key, value) {
          this[field].$setValidity(key, value);
          this.showErrors(!value);
        },

        errorOn: function(field, key) {
          if (this[field] && this[field].show_errors) {
            return this[field].show_errors && this[field].$error[key];
          }
        },

        focus: function(field) {
          this.hideErrors(field);
        },

        blur: function(field) {
          this.change(field);
          this.showErrors(field);
        },

        change: function(field) {
          if (this.validations) {
            var validation = this.validations[field];

            if (_.isFunction(validation)) {
              validation();
            }
          }
        },

        onSubmit: function(callback) {
          this.submitCallbacks.push(callback);
        },

        submit: function() {
          _.each(this.submitCallbacks, function(callback) {
            if (_.isFunction(callback)) {
              callback();
            }
          });

          if (_.isFunction(this.validation)) {
            this.validation();
          }

          if (this.$valid) {
            this.submitting = true;
            this.update();
          } else {
            this.showErrorsOnInValid();
          }
        }
      }
    };
  });