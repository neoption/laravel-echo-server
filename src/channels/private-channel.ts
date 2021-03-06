let request = require('request');
let url = require('url');
import { Channel } from './channel';
import { Log } from './../log';

export class PrivateChannel {
    /**
     * Request client.
     *
     * @type {any}
     */
    private request: any;

    /**
     * Create a new private channel instance.
     *
     * @param {any} options
     */
    constructor(private options: any) {
        this.request = request;
    }

    /**
     * Send authentication request to application server.
     *
     * @param  {any} socket
     * @param  {any} data
     * @return {Promise<any>}
     */
    authenticate(socket: any, data: any): Promise<any> {
        let options = {
            url: this.authHost(socket) + this.options.authEndpoint,
            form: { channel_name: data.channel },
            headers: (data.auth && data.auth.headers) ? data.auth.headers : {},
            rejectUnauthorized: false
        };

        return this.serverRequest(socket, options);
    }

    /**
     * Get the auth host based on the Socket.
     *
     * @param {any} socket
     * @return {string}
     */
    protected authHost(socket: any): string {
        return this.options.authHost.substr(0, this.options.authHost.indexOf('://')) + "://"
            + (socket.request.headers.host.indexOf(':') > 0 ? socket.request.headers.host.substr(0, socket.request.headers.host.indexOf(':')) : socket.request.headers.host);
    }

    /**
     * Check if there is a matching auth host.
     *
     * @param  {any}  referer
     * @param  {any}  host
     * @return {boolean}
     */
    protected hasMatchingHost(referer: any, host: any): boolean {
        return referer.hostname.substr(referer.hostname.indexOf('.')) === host ||
            `${referer.protocol}//${referer.host}` === host ||
            referer.host === host;
    }

    /**
     * Send a request to the server.
     *
     * @param  {any} socket
     * @param  {any} options
     * @return {Promise<any>}
     */
    protected serverRequest(socket: any, options: any): Promise<any> {
        return new Promise<any>((resolve, reject) => {
            options.headers = this.prepareHeaders(socket, options);
            let body;

            this.request.post(options, (error, response, body, next) => {
                if (error) {
                    if (this.options.devMode) {
                        Log.error(`[${new Date().toLocaleTimeString()}] - Error authenticating ${socket.id} for ${options.form.channel_name}`);
                    }

                    Log.error(error);

                    reject({ reason: 'Error sending authentication request.', status: 0 });
                } else if (response.statusCode !== 200) {
                    if (this.options.devMode) {
                        Log.warning(`[${new Date().toLocaleTimeString()}] - ${socket.id} could not be authenticated to ${options.form.channel_name}`);
                        Log.error(response.body);
                    }

                    reject({ reason: 'Client can not be authenticated, got HTTP status ' + response.statusCode, status: response.statusCode });
                } else {
                    if (this.options.devMode) {
                        Log.info(`[${new Date().toLocaleTimeString()}] - ${socket.id} authenticated for: ${options.form.channel_name}`);
                    }

                    try {
                        body = JSON.parse(response.body);
                    } catch (e) {
                        body = response.body
                    }

                    resolve(body);
                }
            });
        });
    }

    /**
     * Prepare headers for request to app server.
     *
     * @param  {any} socket
     * @param  {any} options
     * @return {any}
     */
    protected prepareHeaders(socket: any, options: any): any {
        options.headers['Cookie'] = socket.request.headers.cookie;
        options.headers['X-Requested-With'] = 'XMLHttpRequest';

        return options.headers;
    }
}
