/* eslint-disable @typescript-eslint/no-var-requires */
import {ServerConfig} from './PrivateConfig';
import * as crypto from 'crypto';
import * as path from 'path';
import {ConfigClass, ConfigClassBuilder} from 'typeconfig/node';
import {IConfigClass} from 'typeconfig/common';
import {PasswordHelper} from '../../../backend/model/PasswordHelper';
import {TAGS} from '../public/ClientConfig';
import {NotificationManager} from '../../../backend/model/NotifocationManager';

declare const process: any;
const upTime = new Date().toISOString();
// TODO: Refactor Config to be injectable globally.
// This is a bad habit to let the Config know if its in a testing env.
const isTesting = process.env['NODE_ENV'] == true || ['afterEach', 'after', 'beforeEach', 'before', 'describe', 'it']
  .every((fn) => (global as any)[fn] instanceof Function);

@ConfigClass<IConfigClass<TAGS> & ServerConfig>({
  configPath: path.join(__dirname, !isTesting ? './../../../../config.json' : './../../../../test/backend/tmp/config.json'),
  crateConfigPathIfNotExists: isTesting,
  saveIfNotExist: true,
  attachDescription: true,
  enumsAsString: true,
  softReadonly: true,
  cli: {
    enable: {
      configPath: true,
      attachState: true,
      attachDescription: true,
      rewriteCLIConfig: true,
      rewriteENVConfig: true,
      enumsAsString: true,
      saveIfNotExist: true,
      exitOnConfig: true,
    },
    defaults: {
      enabled: true,
    },
  },
  onLoadedSync: async (config) => {
    let changed = false;
    for (let i = 0; i < config.Users.enforcedUsers.length; ++i) {
      const uc = config.Users.enforcedUsers[i];

      // encrypt password and save back to the config
      if (uc.password) {
        if (!uc.encryptedPassword) {
          uc.encryptedPassword = PasswordHelper.cryptPassword(uc.password);
        }
        uc.password = '';
        changed = true;
      }
      if (!uc.encrypted) {
        uc.encrypted = !!uc.encryptedPassword;
        changed = true;
      }
      if (!uc.encrypted && !uc.password) {
        throw new Error('Password error for enforced user: ' + uc.name);
      }
    }
    if (changed) {
      config.saveSync();
    }
  }
})
export class PrivateConfigClass extends ServerConfig {

  constructor() {
    super();
    if (!this.Server.sessionSecret || this.Server.sessionSecret.length === 0) {
      this.Server.sessionSecret = [
        crypto.randomBytes(256).toString('hex'),
        crypto.randomBytes(256).toString('hex'),
        crypto.randomBytes(256).toString('hex'),
      ];
    }

    this.Environment.appVersion =
      require('../../../../package.json').version;
    this.Environment.buildTime =
      require('../../../../package.json').buildTime;
    this.Environment.buildCommitHash =
      require('../../../../package.json').buildCommitHash;
    this.Environment.upTime = upTime;
    this.Environment.isDocker = !!process.env.PI_DOCKER;
  }


}

export const Config = ConfigClassBuilder.attachInterface(
  new PrivateConfigClass()
);
try {
  Config.loadSync();
} catch (e) {
  console.error('Error during loading config. Reverting to defaults.');
  console.error('This is most likely due to: 1) you added a bad configuration in the server.json OR 2) The configuration changed in the latest release.');
  console.error(e);
  NotificationManager.error('Cant load config. Reverting to default. This is most likely due to: 1) you added a bad configuration in the server.json OR 2) The configuration changed in the latest release.', (e.toString ? e.toString() : JSON.stringify(e)));
}
