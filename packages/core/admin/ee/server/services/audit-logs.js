'use strict';

const localProvider = require('@strapi/provider-audit-logs-local');

const defaultEvents = [
  'entry.create',
  'entry.update',
  'entry.delete',
  'entry.publish',
  'entry.unpublish',
  'media.create',
  'media.update',
  'media.delete',
  'user.create',
  'user.update',
  'user.delete',
  'admin.auth.success',
  'admin.logout',
  'content-type.create',
  'content-type.update',
  'content-type.delete',
  'component.create',
  'component.update',
  'component.delete',
  'role.create',
  'role.update',
  'role.delete',
  'permission.create',
  'permission.update',
  'permission.delete',
];

const getEventMap = (defaultEvents) => {
  const getDefaultPayload = (...args) => args[0];

  // Use the default payload for all default events
  return defaultEvents.reduce((acc, event) => {
    acc[event] = getDefaultPayload;
    return acc;
  }, {});
};

const createAuditLogsService = (strapi) => {
  // NOTE: providers should be able to replace getEventMap to add or remove events
  const eventMap = getEventMap(defaultEvents);

  const processEvent = (name, ...args) => {
    const getPayload = eventMap[name];

    // Ignore the event if it's not in the map
    if (!getPayload) {
      return null;
    }

    return {
      action: name,
      date: new Date().toISOString(),
      payload: getPayload(...args) || {},
      userId: strapi.requestContext.get()?.state?.user?.id,
    };
  };

  async function handleEvent(name, ...args) {
    const processedEvent = processEvent(name, ...args);

    if (processedEvent) {
      await this._provider.saveEvent(processedEvent);
    }
  }

  return {
    async register() {
      this._provider = await localProvider.register({ strapi });
      this._eventHubUnsubscribe = strapi.eventHub.subscribe(handleEvent.bind(this));
      return this;
    },

    unsubscribe() {
      if (this._eventHubUnsubscribe) {
        this._eventHubUnsubscribe();
      }
      return this;
    },

    destroy() {
      return this.unsubscribe();
    },
  };
};

module.exports = createAuditLogsService;
