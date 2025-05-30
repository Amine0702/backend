<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Invitation à rejoindre un projet</title>
    <style>
        body, html {
            margin: 0;
            padding: 0;
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            color: #FFFFFF;
            background-color: #f5f7fa;
            line-height: 1.6;
        }
        .email-container {
            max-width: 600px;
            margin: 20px auto;
            background: #ffffff;
            border-radius: 8px;
            overflow: hidden;
            box-shadow: 0 4px 10px rgba(0, 0, 0, 0.1);
        }
        .email-header {
            background: linear-gradient(135deg, #6366F1 0%, #4F46E5 100%);
            color: white;
            padding: 30px;
            text-align: center;
        }
        .email-header h1 {
            margin: 0;
            font-size: 24px;
            font-weight: 600;
        }
        .email-body {
            padding: 30px;
        }
        .project-name {
            font-size: 20px;
            font-weight: 600;
            color: #4F46E5;
            margin-bottom: 5px;
        }
        .project-details {
            background-color: #f8fafc;
            border-left: 4px solid #6366F1;
            padding: 15px;
            margin: 20px 0;
            border-radius: 0 4px 4px 0;
        }
        .project-details h2 {
            margin-top: 0;
            font-size: 18px;
            color: #4F46E5;
        }
        .dates {
            display: flex;
            justify-content: space-between;
            flex-wrap: wrap;
            margin-top: 15px;
        }
        .date-item {
            flex: 1;
            min-width: 120px;
            background: white;
            padding: 10px;
            margin: 5px;
            border-radius: 4px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.05);
        }
        .date-label {
            font-size: 12px;
            color: #6b7280;
            margin-bottom: 5px;
        }
        .date-value {
            font-weight: 600;
            color: #374151;
        }
        .role-badge {
            display: inline-block;
            padding: 5px 12px;
            border-radius: 50px;
            font-size: 14px;
            font-weight: 600;
            margin-bottom: 20px;
        }
        .role-observer {
            background-color: #e0f2fe;
            color: #0369a1;
        }
        .role-member {
            background-color: #dcfce7;
            color: #15803d;
        }
        .role-manager {
            background-color: #ede9fe;
            color: #6d28d9;
        }
        .role-description {
            background-color: #f8fafc;
            padding: 15px;
            border-radius: 6px;
            margin-bottom: 25px;
        }
        .cta-button {
            display: inline-block;
            background: linear-gradient(135deg, #6366F1 0%, #4F46E5 100%);
            color: white;
            text-decoration: none;
            padding: 12px 30px;
            border-radius: 6px;
            font-weight: 600;
            margin: 20px 0;
            text-align: center;
            transition: all 0.3s ease;
        }
        .cta-button:hover {
            background: linear-gradient(135deg, #4F46E5 0%, #4338CA 100%);
            box-shadow: 0 4px 12px rgba(79, 70, 229, 0.3);
        }
        .email-footer {
            padding: 20px 30px;
            text-align: center;
            color: #6b7280;
            font-size: 14px;
            border-top: 1px solid #e5e7eb;
        }
        .signature {
            margin-top: 15px;
            font-weight: 600;
            color: #4b5563;
        }
        @media only screen and (max-width: 600px) {
            .email-container {
                width: 100%;
                margin: 0;
                border-radius: 0;
            }
            .email-header, .email-body, .email-footer {
                padding: 20px;
            }
            .dates {
                flex-direction: column;
            }
            .date-item {
                margin: 5px 0;
            }
        }
    </style>
</head>
<body>
    <div class="email-container">
        <div class="email-header">
            <h1>Invitation à rejoindre un projet</h1>
        </div>
        <div class="email-body">
            <p>Bonjour,</p>
            
            <p>Vous avez été invité(e) à rejoindre le projet:</p>
            <div class="project-name">{{ $project->name }}</div>
            
            <div class="project-details">
                <h2>Détails du projet</h2>
                <p><strong>Description:</strong><br>{{ $project->description }}</p>
                
                <div class="dates">
                    <div class="date-item">
                        <div class="date-label">Date de début</div>
                        <div class="date-value">{{ \Carbon\Carbon::parse($project->start_date)->format('d/m/Y') }}</div>
                    </div>
                    <div class="date-item">
                        <div class="date-label">Date de fin</div>
                        <div class="date-value">{{ \Carbon\Carbon::parse($project->end_date)->format('d/m/Y') }}</div>
                    </div>
                </div>
            </div>
            
            <h2>Votre rôle</h2>
            
            @if($role == 'observer')
                <div class="role-badge role-observer">Observateur</div>
                <div class="role-description">
                    En tant qu'<strong>Observateur</strong>, vous pourrez voir les tâches mais ne pourrez pas les modifier.
                </div>
            @elseif($role == 'member')
                <div class="role-badge role-member">Membre</div>
                <div class="role-description">
                    En tant que <strong>Membre</strong>, vous pourrez modifier vos propres tâches et en créer de nouvelles.
                </div>
            @elseif($role == 'manager')
                <div class="role-badge role-manager">Manager</div>
                <div class="role-description">
                    En tant que <strong>Manager</strong>, vous aurez un accès complet, pourrez assigner des tâches et modifier toutes les tâches.
                </div>
            @endif
            
            <p>Nous serions ravis de vous avoir à bord pour ce projet. Si vous êtes prêt(e) à rejoindre l'équipe, cliquez sur le bouton ci-dessous.</p>
            
            <div style="text-align: center;">
                <a href="{{ $joinLink }}" class="cta-button">Rejoindre le projet</a>
            </div>
            
            <p>Si vous avez des questions, n'hésitez pas à nous contacter.</p>
            
            <div class="signature">
                Bien cordialement,<br>
                L'équipe {{ config('app.name', 'MDW') }}
            </div>
        </div>
        <div class="email-footer">
            &copy; {{ date('Y') }} {{ config('app.name', 'MDW') }}. Tous droits réservés.
        </div>
    </div>
</body>
</html>
