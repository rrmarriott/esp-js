import {Router, Guard, isEspDecoratedObject} from 'esp-js';
import {PolimerHandlerMap} from './eventHandlers';
import {PolimerModel, PolimerModelSetup, StateHandlerModelMetadata} from './polimerModel';
import {OutputEventStreamFactory} from './eventStreamObservable';
import {Store} from './store';
import {StateHandlerModel} from './stateHandlerModel';

declare module 'esp-js/.dist/typings/router/router' {
    export interface Router {
        storeBuilder?<TStore extends Store>(): PolimerStoreBuilder<TStore>;
    }
}

export class PolimerStoreBuilder<TStore extends Store> {
    private _stateHandlerMaps: Map<string, PolimerHandlerMap<any, TStore>> = new Map();
    private _stateHandlerObjects: Map<string, any[]> = new Map();
    private _stateHandlerModels: Map<string, StateHandlerModelMetadata> = new Map();
    private _eventStreamFactories: OutputEventStreamFactory<TStore, any, any>[] = [];
    private _eventStreamHandlerObjects: any[] = [];
    private _initialStore: TStore;

    constructor(private _router: Router) {
    }

    withInitialStore(store: TStore): PolimerStoreBuilder<TStore> {
        this._initialStore = store;
        return this;
    }

    withStateHandlerMap<TKey extends keyof TStore, TState extends TStore[TKey]>(state: TKey, handlerMap: PolimerHandlerMap<TState, TStore>): PolimerStoreBuilder<TStore> {
        this._stateHandlerMaps.set(<string>state, handlerMap);
        return this;
    }

    withStateHandlerObject<TKey extends keyof TStore>(state: TKey, ...objectToScanForHandlers: any[]): PolimerStoreBuilder<TStore> {
        objectToScanForHandlers.forEach(handler => {
            if (isEspDecoratedObject(handler)) {
                let handlers = this._stateHandlerObjects.get(<string>state);
                if (!handlers) {
                    handlers = [];
                    this._stateHandlerObjects.set(<string>state, handlers);
                }
                handlers.push(handler);
            } else {
                throw new Error(`Unknown observable object for state ${state}. There was no esp decorator metadata on object passed to 'withObservablesOn(o)'`);
            }
        });
        return this;
    }

    /**
     *
     * @param state
     * @param stateHandlerModel
     * @param autoWireUpObservers
     */
    withStateHandlerModel<TKey extends keyof TStore, TStateHandlerModel extends StateHandlerModel<TStore[TKey]>>(state: TKey, stateHandlerModel: TStateHandlerModel, autoWireUpObservers = false): PolimerStoreBuilder<TStore>  {
        this._stateHandlerModels.set(<string>state, {model: stateHandlerModel, autoWireUpObservers});
        return this;
    }

    withEventStreams(...outputEventStreamFactory: OutputEventStreamFactory<TStore, any, any>[]): PolimerStoreBuilder<TStore> {
        this._eventStreamFactories.push(...outputEventStreamFactory);
        return this;
    }

    withEventStreamsOn(...objectsToScanForObservables: any[]): PolimerStoreBuilder<TStore> {
        objectsToScanForObservables.forEach(o => {
            if (isEspDecoratedObject(o)) {
                this._eventStreamHandlerObjects.push(o);
            } else {
                throw new Error(`Unknown observable object. There was no esp decorator metadata on object passed to 'withObservablesOn(o)'`);
            }
        });
        return this;
    }

    registerWithRouter(): PolimerModel<TStore> {
        Guard.isDefined(this._initialStore, 'Initial store is not set');
        Guard.stringIsNotEmpty(this._initialStore.modelId, `Initial store's modelId must not be null or empty`);
        Guard.isTruthy(this._stateHandlerMaps.size > 0 || this._stateHandlerObjects.size > 0, `No states setup for store ${this._initialStore.modelId}`);

        // The polimer model is a special case,
        // Some attributes may get bound to it dynamically.
        // Eor example the @viewBinding decorator.
        // Given that, we create a new ctro function to allow custom metadata to be added to this specific instance dynamically.
        let customPolimerModel = class CustomPolimerModel extends PolimerModel<TStore> {};
        let polimerModel = new customPolimerModel(
            this._router,
            <PolimerModelSetup<TStore>>{
                initialStore: this._initialStore,
                stateHandlerMaps: this._stateHandlerMaps,
                stateHandlerObjects: this._stateHandlerObjects,
                stateHandlerModels: this._stateHandlerModels,
                eventStreamFactories: this._eventStreamFactories,
                eventStreamHandlerObjects: this._eventStreamHandlerObjects
            }
        );

        this._router.addModel(
            this._initialStore.modelId,
            polimerModel,
            // TODO figure out how best to push just the store to the views yet still have the view bindings work
            // {modelObservableMapper: (model: PolimerModel<TStore>) => model.getStore()}
        );

        polimerModel.initialize();

        return polimerModel;
    }
}

Router.prototype.storeBuilder = function <TStore extends Store>(): PolimerStoreBuilder<TStore> {
    let router = this;
    return new PolimerStoreBuilder(router);
};
