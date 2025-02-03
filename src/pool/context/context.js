'use strict';
var __runInitializers =
  (this && this.__runInitializers) ||
  function (thisArg, initializers, value) {
    var useValue = arguments.length > 2;
    for (var i = 0; i < initializers.length; i++) {
      value = useValue
        ? initializers[i].call(thisArg, value)
        : initializers[i].call(thisArg);
    }
    return useValue ? value : void 0;
  };
var __esDecorate =
  (this && this.__esDecorate) ||
  function (
    ctor,
    descriptorIn,
    decorators,
    contextIn,
    initializers,
    extraInitializers,
  ) {
    function accept(f) {
      if (f !== void 0 && typeof f !== 'function')
        throw new TypeError('Function expected');
      return f;
    }
    var kind = contextIn.kind,
      key = kind === 'getter' ? 'get' : kind === 'setter' ? 'set' : 'value';
    var target =
      !descriptorIn && ctor
        ? contextIn['static']
          ? ctor
          : ctor.prototype
        : null;
    var descriptor =
      descriptorIn ||
      (target ? Object.getOwnPropertyDescriptor(target, contextIn.name) : {});
    var _,
      done = false;
    for (var i = decorators.length - 1; i >= 0; i--) {
      var context = {};
      for (var p in contextIn) context[p] = p === 'access' ? {} : contextIn[p];
      for (var p in contextIn.access) context.access[p] = contextIn.access[p];
      context.addInitializer = function (f) {
        if (done)
          throw new TypeError(
            'Cannot add initializers after decoration has completed',
          );
        extraInitializers.push(accept(f || null));
      };
      var result = (0, decorators[i])(
        kind === 'accessor'
          ? { get: descriptor.get, set: descriptor.set }
          : descriptor[key],
        context,
      );
      if (kind === 'accessor') {
        if (result === void 0) continue;
        if (result === null || typeof result !== 'object')
          throw new TypeError('Object expected');
        if ((_ = accept(result.get))) descriptor.get = _;
        if ((_ = accept(result.set))) descriptor.set = _;
        if ((_ = accept(result.init))) initializers.unshift(_);
      } else if ((_ = accept(result))) {
        if (kind === 'field') initializers.unshift(_);
        else descriptor[key] = _;
      }
    }
    if (target) Object.defineProperty(target, contextIn.name, descriptor);
    done = true;
  };
var __awaiter =
  (this && this.__awaiter) ||
  function (thisArg, _arguments, P, generator) {
    function adopt(value) {
      return value instanceof P
        ? value
        : new P(function (resolve) {
            resolve(value);
          });
    }
    return new (P || (P = Promise))(function (resolve, reject) {
      function fulfilled(value) {
        try {
          step(generator.next(value));
        } catch (e) {
          reject(e);
        }
      }
      function rejected(value) {
        try {
          step(generator['throw'](value));
        } catch (e) {
          reject(e);
        }
      }
      function step(result) {
        result.done
          ? resolve(result.value)
          : adopt(result.value).then(fulfilled, rejected);
      }
      step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
  };
var __generator =
  (this && this.__generator) ||
  function (thisArg, body) {
    var _ = {
        label: 0,
        sent: function () {
          if (t[0] & 1) throw t[1];
          return t[1];
        },
        trys: [],
        ops: [],
      },
      f,
      y,
      t,
      g;
    return (
      (g = { next: verb(0), throw: verb(1), return: verb(2) }),
      typeof Symbol === 'function' &&
        (g[Symbol.iterator] = function () {
          return this;
        }),
      g
    );
    function verb(n) {
      return function (v) {
        return step([n, v]);
      };
    }
    function step(op) {
      if (f) throw new TypeError('Generator is already executing.');
      while ((g && ((g = 0), op[0] && (_ = 0)), _))
        try {
          if (
            ((f = 1),
            y &&
              (t =
                op[0] & 2
                  ? y['return']
                  : op[0]
                    ? y['throw'] || ((t = y['return']) && t.call(y), 0)
                    : y.next) &&
              !(t = t.call(y, op[1])).done)
          )
            return t;
          if (((y = 0), t)) op = [op[0] & 2, t.value];
          switch (op[0]) {
            case 0:
            case 1:
              t = op;
              break;
            case 4:
              _.label++;
              return { value: op[1], done: false };
            case 5:
              _.label++;
              y = op[1];
              op = [0];
              continue;
            case 7:
              op = _.ops.pop();
              _.trys.pop();
              continue;
            default:
              if (
                !((t = _.trys), (t = t.length > 0 && t[t.length - 1])) &&
                (op[0] === 6 || op[0] === 2)
              ) {
                _ = 0;
                continue;
              }
              if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) {
                _.label = op[1];
                break;
              }
              if (op[0] === 6 && _.label < t[1]) {
                _.label = t[1];
                t = op;
                break;
              }
              if (t && _.label < t[2]) {
                _.label = t[2];
                _.ops.push(op);
                break;
              }
              if (t[2]) _.ops.pop();
              _.trys.pop();
              continue;
          }
          op = body.call(thisArg, _);
        } catch (e) {
          op = [6, e];
          y = 0;
        } finally {
          f = t = 0;
        }
      if (op[0] & 5) throw op[1];
      return { value: op[0] ? op[1] : void 0, done: true };
    }
  };
Object.defineProperty(exports, '__esModule', { value: true });
exports.TaskContext = void 0;
var state_1 = require('../../decorator/state');
var TaskContext = (function () {
  var _a;
  var _instanceExtraInitializers = [];
  var _clearResource_decorators;
  var _runTask_decorators;
  var _free_decorators;
  return (
    (_a = /** @class */ (function () {
      function TaskContext(browser, contextTimeout) {
        if (contextTimeout === void 0) {
          contextTimeout = 10000;
        }
        this.browser =
          (__runInitializers(this, _instanceExtraInitializers), browser);
        this.contextTimeout = contextTimeout;
        this.ResponsiveCheckTimeOut = 200;
      }
      TaskContext.prototype.checkPageResponsive = function () {
        return __awaiter(this, void 0, void 0, function () {
          var _b;
          return __generator(this, function (_c) {
            switch (_c.label) {
              case 0:
                _c.trys.push([0, 2, , 3]);
                return [
                  4 /*yield*/,
                  this.page.evaluate(
                    function () {
                      return true;
                    },
                    {},
                    { timeout: this.ResponsiveCheckTimeOut },
                  ),
                ];
              case 1:
                _c.sent();
                return [2 /*return*/, true];
              case 2:
                _b = _c.sent();
                return [2 /*return*/, false];
              case 3:
                return [2 /*return*/];
            }
          });
        });
      };
      TaskContext.prototype.clearResource = function () {
        return __awaiter(this, void 0, void 0, function () {
          var devToolSession;
          return __generator(this, function (_b) {
            switch (_b.label) {
              case 0:
                if (!this.page) return [3 /*break*/, 6];
                return [4 /*yield*/, this.page.createCDPSession()];
              case 1:
                devToolSession = _b.sent();
                return [4 /*yield*/, this.page.goto('about:blank')];
              case 2:
                _b.sent();
                return [
                  4 /*yield*/,
                  devToolSession.send('Network.clearBrowserCache'),
                ];
              case 3:
                _b.sent();
                return [
                  4 /*yield*/,
                  devToolSession.send('Network.clearBrowserCookies'),
                ];
              case 4:
                _b.sent();
                return [
                  4 /*yield*/,
                  this.page.evaluate(function () {
                    localStorage.clear();
                    sessionStorage.clear();
                  }),
                ];
              case 5:
                _b.sent();
                _b.label = 6;
              case 6:
                return [2 /*return*/];
            }
          });
        });
      };
      TaskContext.prototype.runTask = function (task) {
        return __awaiter(this, void 0, void 0, function () {
          var result, e_1;
          return __generator(this, function (_b) {
            switch (_b.label) {
              case 0:
                if (!this.page) return [3 /*break*/, 6];
                _b.label = 1;
              case 1:
                _b.trys.push([1, 3, 4, 6]);
                return [4 /*yield*/, task(this.page)];
              case 2:
                result = _b.sent();
                return [
                  2 /*return*/,
                  {
                    success: true,
                    data: result,
                  },
                ];
              case 3:
                e_1 = _b.sent();
                return [
                  2 /*return*/,
                  {
                    success: false,
                    errorMessage: String(e_1),
                  },
                ];
              case 4:
                return [4 /*yield*/, this.clearResource()];
              case 5:
                _b.sent();
                return [7 /*endfinally*/];
              case 6:
                return [2 /*return*/];
            }
          });
        });
      };
      TaskContext.prototype.free = function () {
        return __awaiter(this, void 0, void 0, function () {
          return __generator(this, function (_b) {
            switch (_b.label) {
              case 0:
                if (!this.page) return [3 /*break*/, 3];
                return [4 /*yield*/, this.clearResource()];
              case 1:
                _b.sent();
                return [4 /*yield*/, this.page.close()];
              case 2:
                _b.sent();
                _b.label = 3;
              case 3:
                return [2 /*return*/];
            }
          });
        });
      };
      return TaskContext;
    })()),
    (function () {
      var _metadata =
        typeof Symbol === 'function' && Symbol.metadata
          ? Object.create(null)
          : void 0;
      _clearResource_decorators = [
        (0, state_1.RequireState)(state_1.ContextState.IDLE),
        (0, state_1.SetState)(state_1.ContextState.RUNNING),
      ];
      _runTask_decorators = [
        (0, state_1.RequireState)(state_1.ContextState.IDLE),
        (0, state_1.SetState)(state_1.ContextState.RUNNING),
      ];
      _free_decorators = [(0, state_1.RequireState)(state_1.ContextState.IDLE)];
      __esDecorate(
        _a,
        null,
        _clearResource_decorators,
        {
          kind: 'method',
          name: 'clearResource',
          static: false,
          private: false,
          access: {
            has: function (obj) {
              return 'clearResource' in obj;
            },
            get: function (obj) {
              return obj.clearResource;
            },
          },
          metadata: _metadata,
        },
        null,
        _instanceExtraInitializers,
      );
      __esDecorate(
        _a,
        null,
        _runTask_decorators,
        {
          kind: 'method',
          name: 'runTask',
          static: false,
          private: false,
          access: {
            has: function (obj) {
              return 'runTask' in obj;
            },
            get: function (obj) {
              return obj.runTask;
            },
          },
          metadata: _metadata,
        },
        null,
        _instanceExtraInitializers,
      );
      __esDecorate(
        _a,
        null,
        _free_decorators,
        {
          kind: 'method',
          name: 'free',
          static: false,
          private: false,
          access: {
            has: function (obj) {
              return 'free' in obj;
            },
            get: function (obj) {
              return obj.free;
            },
          },
          metadata: _metadata,
        },
        null,
        _instanceExtraInitializers,
      );
      if (_metadata)
        Object.defineProperty(_a, Symbol.metadata, {
          enumerable: true,
          configurable: true,
          writable: true,
          value: _metadata,
        });
    })(),
    _a
  );
})();
exports.TaskContext = TaskContext;
