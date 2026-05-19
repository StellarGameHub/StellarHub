import { BrowserWindow } from 'electron';
import { randomBytes } from 'crypto';
import querystring from 'querystring';
import axios from 'axios';

const STEAM_OPENID_URL = 'https://steamcommunity.com/openid/login';

/**
 * Construye la URL de redirección a Steam para iniciar sesión.
 * @param realm URL base de tu aplicación (sin /auth/steam/return)
 * @param returnUrl URL de callback completa
 * @returns URL completa para redirigir al usuario
 */
function buildSteamOpenIdUrl(realm: string, returnUrl: string): string {
    const params = {
        'openid.ns': 'http://specs.openid.net/auth/2.0',
        'openid.mode': 'checkid_setup',
        'openid.return_to': returnUrl,
        'openid.realm': realm,
        'openid.identity': 'http://specs.openid.net/auth/2.0/identifier_select',
        'openid.claimed_id': 'http://specs.openid.net/auth/2.0/identifier_select',
    };
    return `${STEAM_OPENID_URL}?${querystring.stringify(params)}`;
}

/**
 * Valida la respuesta de Steam y extrae el SteamID.
 * @param queryParams Query string de la URL callback
 * @returns SteamID (identificador de 17 dígitos)
 * @throws Error si la respuesta es inválida o no se puede verificar
 */
async function validateSteamResponse(queryParams: querystring.ParsedUrlQuery): Promise<string> {
    // Verificar si Steam devolvió un error
    if (queryParams['openid.mode'] === 'cancel') {
        throw new Error('El usuario canceló el inicio de sesión');
    }

    // Verificar parámetros requeridos
    const requiredParams = ['openid.assoc_handle', 'openid.signed', 'openid.sig', 'openid.claimed_id', 'openid.identity', 'openid.return_to', 'openid.response_nonce'];
    for (const param of requiredParams) {
        if (!queryParams[param]) {
            throw new Error(`Falta el parámetro requerido: ${param}`);
        }
    }

    // Extraer claimed_id y obtener SteamID
    const claimedId = queryParams['openid.claimed_id'] as string;
    const steamIdMatch = claimedId.match(/https?:\/\/steamcommunity\.com\/openid\/id\/(\d{17,})/);
    if (!steamIdMatch) {
        throw new Error('ID de Steam inválido en la respuesta');
    }
    const steamId = steamIdMatch[1];

    // Construir la URL de verificación para OpenID 2.0 (modo check_authentication)
    // Se deben enviar todos los parámetros openid.* recibidos, cambiando openid.mode a 'check_authentication'
    const paramsToSend: Record<string, string> = {};
    for (const [key, value] of Object.entries(queryParams)) {
        if (key.startsWith('openid.')) {
            paramsToSend[key] = value as string;
        }
    }
    paramsToSend['openid.mode'] = 'check_authentication';

    // Construir query string
    const verificationUrl = `${STEAM_OPENID_URL}?${querystring.stringify(paramsToSend)}`;

    // Enviar solicitud GET (Steam espera GET para la validación)
    const verificationResponse = await axios.get(verificationUrl);
    const responseText = verificationResponse.data;

    // La respuesta debe contener "is_valid:true"
    if (responseText.includes('is_valid:true')) {
        return steamId;
    } else {
        throw new Error('La validación con Steam falló (is_valid no es true)');
    }
}

/**
 * Realiza el flujo completo de inicio de sesión con Steam.
 * Abre una ventana de navegador para que el usuario inicie sesión.
 * @param realm URL base de tu aplicación (ej. http://localhost:3000)
 * @param callbackUrl URL de callback completa (ej. http://localhost:3000/auth/steam/callback)
 * @returns Promesa que se resuelve con el SteamID del usuario autenticado
 */
export async function startSteamLogin(realm: string, callbackUrl: string): Promise<string> {
    return new Promise((resolve, reject) => {
        const authWindow = new BrowserWindow({
            width: 800,
            height: 600,
            title: 'Iniciar sesión con Steam - StellarHub',
            webPreferences: {
                nodeIntegration: false,
                contextIsolation: true
            },
            parent: undefined,
            modal: false,
            show: true,
            alwaysOnTop: true
        });

        // Construir URL de inicio de sesión de Steam
        const loginUrl = buildSteamOpenIdUrl(realm, callbackUrl);
        authWindow.loadURL(loginUrl);

        // Manejar redirecciones para capturar el callback
        authWindow.webContents.on('will-redirect', async (event, redirectUrl) => {
            if (redirectUrl.startsWith(callbackUrl)) {
                event.preventDefault();
                const url = new URL(redirectUrl);
                const queryParams = querystring.parse(url.search.substring(1));
                try {
                    const steamId = await validateSteamResponse(queryParams);
                    authWindow.close();
                    resolve(steamId);
                } catch (error) {
                    authWindow.close();
                    reject(error);
                }
            }
        });

        authWindow.on('closed', () => {
            reject(new Error('Ventana de autenticación cerrada por el usuario'));
        });
    });
}