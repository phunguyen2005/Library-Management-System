<?php

namespace App\Socialite;

use Laravel\Socialite\Two\AbstractProvider;
use Laravel\Socialite\Two\ProviderInterface;
use Laravel\Socialite\Two\User;

class MicrosoftProvider extends AbstractProvider implements ProviderInterface
{
    protected $scopes = ['User.Read'];

    protected function getTenant()
    {
        return config('services.microsoft.tenant', 'common');
    }

    protected function getAuthUrl($state)
    {
        return $this->buildAuthUrlFromBase('https://login.microsoftonline.com/' . $this->getTenant() . '/oauth2/v2.0/authorize', $state);
    }

    protected function getTokenUrl()
    {
        return 'https://login.microsoftonline.com/' . $this->getTenant() . '/oauth2/v2.0/token';
    }

    protected function getUserByToken($token)
    {
        $response = $this->getHttpClient()->get('https://graph.microsoft.com/v1.0/me', [
            'headers' => [
                'Authorization' => 'Bearer ' . $token,
                'Accept' => 'application/json',
            ],
        ]);

        return json_decode($response->getBody()->getContents(), true);
    }

    protected function mapUserToObject(array $user)
    {
        return (new User)->setRaw($user)->map([
            'id' => $user['id'],
            'nickname' => null,
            'name' => $user['displayName'] ?? ($user['givenName'] . ' ' . $user['surname']),
            'email' => $user['mail'] ?? $user['userPrincipalName'],
            'avatar' => null,
        ]);
    }
}
