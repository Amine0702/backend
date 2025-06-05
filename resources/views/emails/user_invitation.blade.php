<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Invitation à rejoindre notre application</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f7f7f7; color: #333333;">
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center" width="100%" style="max-width: 600px; margin: auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 10px rgba(0,0,0,0.05);">
        <!-- Header -->
        <tr>
            <td style="padding: 0;">
                <table width="100%" style="border-spacing: 0; background: linear-gradient(135deg, #6366F1 0%, #4F46E5 100%); color: white;">
                    <tr>
                        <td style="padding: 30px 40px; text-align: center;">
                            <h1 style="margin: 0; font-size: 28px; font-weight: 700; letter-spacing: -0.5px;">Invitation à rejoindre notre plateforme</h1>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
        
        <!-- Content -->
        <tr>
            <td style="padding: 40px 40px 20px;">
                <table width="100%" style="border-spacing: 0;">
                    <tr>
                        <td>
                            <p style="margin: 0 0 20px; font-size: 16px; line-height: 1.5;">Bonjour,</p>
                            <p style="margin: 0 0 20px; font-size: 16px; line-height: 1.5;">
                                <strong style="color: #4F46E5;">{{ $inviterName }}</strong> vous invite à rejoindre notre application en tant que 
                                <span style="display: inline-block; background-color: #EEF2FF; color: #4F46E5; padding: 2px 8px; border-radius: 4px; font-weight: 500;">{{ $role === 'admin' ? 'Administrateur' : 'Utilisateur' }}</span>
                            </p>
                            <p style="margin: 0 0 25px; font-size: 16px; line-height: 1.5;">Pour accepter cette invitation et créer votre compte, veuillez cliquer sur le bouton ci-dessous :</p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
        
        <!-- Button -->
        <tr>
            <td style="padding: 0 40px 30px;">
                <table width="100%" style="border-spacing: 0;">
                    <tr>
                        <td align="center">
                            <a href="{{ $joinLink }}" style="display: inline-block; background-color: #4F46E5; color: #ffffff; font-size: 16px; font-weight: 600; text-decoration: none; padding: 12px 30px; border-radius: 6px; transition: background-color 0.3s ease;">Accepter l'invitation</a>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
        
        <!-- Info -->
        <tr>
            <td style="padding: 0 40px 40px;">
                <table width="100%" style="border-spacing: 0;">
                    <tr>
                        <td>
                            <p style="margin: 0 0 20px; font-size: 15px; line-height: 1.5; color: #666666;">
                                Ce lien d'invitation expirera le <span style="color: #4F46E5; font-weight: 500;">{{ $expiresAt->format('d/m/Y à H:i') }}</span>.
                            </p>
                            <p style="margin: 0 0 20px; font-size: 15px; line-height: 1.5; color: #666666;">
                                Si vous n'êtes pas intéressé(e) par cette invitation, vous pouvez simplement ignorer cet email.
                            </p>
                            <p style="margin: 0; font-size: 15px; line-height: 1.5; color: #666666;">
                                Merci et à bientôt sur notre plateforme !
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
        
        <!-- Footer -->
        <tr>
            <td style="padding: 0;">
                <table width="100%" style="border-spacing: 0; background-color: #F9FAFB; border-top: 1px solid #E5E7EB;">
                    <tr>
                        <td style="padding: 20px 40px; text-align: center;">
                            <p style="margin: 0; font-size: 14px; color: #6B7280;">
                                Cet email a été envoyé automatiquement, merci de ne pas y répondre.
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
    
    <!-- Spacer -->
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center" width="100%" style="max-width: 600px; margin: auto;">
        <tr>
            <td style="padding: 20px 0;">
                &nbsp;
            </td>
        </tr>
    </table>
</body>
</html>
