import {Config} from '../../../../src/common/config/private/Config';
import {Server} from '../../../../src/backend/server';
import {UserDTO, UserRoles} from '../../../../src/common/entities/UserDTO';
import * as path from 'path';
import * as fs from 'fs';
import {SQLConnection} from '../../../../src/backend/model/database/SQLConnection';
import {ObjectManagers} from '../../../../src/backend/model/ObjectManagers';
import {Utils} from '../../../../src/common/Utils';
import {SuperAgentStatic} from 'superagent';
import {RouteTestingHelper} from './RouteTestingHelper';
import {QueryParams} from '../../../../src/common/QueryParams';
import {DatabaseType} from '../../../../src/common/config/private/PrivateConfig';


process.env.NODE_ENV = 'test';
const chai: any = require('chai');
const chaiHttp = require('chai-http');
const should = chai.should();
const {expect} = chai;
chai.use(chaiHttp);

describe('PublicRouter', () => {

  const testUser: UserDTO = {
    id: 1,
    name: 'test',
    password: 'test',
    role: UserRoles.User,
    permissions: null
  };
  const {password: pass, ...expectedUser} = testUser;
  const tempDir = path.join(__dirname, '../../tmp');
  let server: Server;
  const setUp = async () => {
    await fs.promises.rm(tempDir, {recursive: true, force: true});
    Config.Users.authenticationRequired = true;
    Config.Sharing.enabled = true;
    Config.Database.type = DatabaseType.sqlite;
    Config.Database.dbFolder = tempDir;

    server = new Server();
    await server.onStarted.wait();

    await ObjectManagers.getInstance().init();
    await ObjectManagers.getInstance().UserManager.createUser(Utils.clone(testUser));
    await SQLConnection.close();
  };
  const tearDown = async () => {
    await ObjectManagers.reset();
    await fs.promises.rm(tempDir, {recursive: true, force: true});
  };

  const shouldHaveInjectedUser = (result: any, user: any) => {

    result.should.have.status(200);
    result.text.should.be.a('string');
    result.body.should.deep.equal({});
    const startToken = 'ServerInject = {user:';
    const endToken = ', ConfigInject';

    const u = JSON.parse(result.text.substring(result.text.indexOf(startToken) + startToken.length, result.text.indexOf(endToken)));

    delete u?.csrfToken;
    expect(u).to.deep.equal(user);
  };


  describe('/Get share/:' + QueryParams.gallery.sharingKey_params, () => {

    beforeEach(setUp);
    afterEach(tearDown);

    const fistLoad = async (srv: Server, sharingKey: string): Promise<any> => {
      return (chai.request(srv.Server) as SuperAgentStatic)
        .get('/share/' + sharingKey);
    };

    it('should not get default user with passworded share share without password', async () => {
      Config.Sharing.passwordProtected = true;
      const sharing = await RouteTestingHelper.createSharing(testUser, 'secret_pass');
      const res = await fistLoad(server, sharing.sharingKey);
      shouldHaveInjectedUser(res, null);
    });


    it('should get default user with no-password share', async () => {
      Config.Sharing.passwordProtected = true;
      const sharing = await RouteTestingHelper.createSharing(testUser);
      const res = await fistLoad(server, sharing.sharingKey);
      shouldHaveInjectedUser(res, RouteTestingHelper.getExpectedSharingUser(sharing));
    });

    it('should get default user for no-password share when password protection disabled', async () => {
      Config.Sharing.passwordProtected = false;
      const sharing = await RouteTestingHelper.createSharing(testUser);
      const res = await fistLoad(server, sharing.sharingKey);
      shouldHaveInjectedUser(res, RouteTestingHelper.getExpectedSharingUser(sharing));
    });

    it('should get default user for passworded share when password protection disabled', async () => {
      Config.Sharing.passwordProtected = false;
      const sharing = await RouteTestingHelper.createSharing(testUser, 'secret_pass');
      const res = await fistLoad(server, sharing.sharingKey);
      shouldHaveInjectedUser(res, RouteTestingHelper.getExpectedSharingUser(sharing));
    });


  });


});
