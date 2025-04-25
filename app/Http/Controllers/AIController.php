<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Log;
use App\Http\Controllers\TaskController;

class AIController extends Controller
{
    /**
     * Générer une tâche avec une IA (Hugging Face gratuit)
     */
    public function generateTask(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'description' => 'required|string|min:10',
            'column_id' => 'required|exists:columns,id',
            'creator_id' => 'required|string',
        ], [
            'description.required' => 'La description de la tâche est obligatoire',
            'description.min' => 'La description doit contenir au moins 10 caractères',
            'column_id.required' => 'L\'identifiant de la colonne est obligatoire',
            'column_id.exists' => 'La colonne sélectionnée n\'existe pas',
            'creator_id.required' => 'L\'identifiant du créateur est obligatoire',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        try {
            // Récupérer la clé API Hugging Face depuis les variables d'environnement
            $huggingFaceApiKey = env('HUGGINGFACE_API_KEY');

            // Si nous avons une clé API Hugging Face, utiliser leur API
            if ($huggingFaceApiKey) {
                Log::info('Utilisation de l\'API Hugging Face', ['description' => $request->description]);

                // Préparer le prompt pour l'IA
                $prompt = "Tu es un assistant spécialisé dans la gestion de projet. Analyse la description suivante et génère une tâche structurée: " . $request->description . "\n\n";
                $prompt .= "Réponds UNIQUEMENT avec un JSON valide contenant ces champs:\n";
                $prompt .= "- title: un titre court et descriptif pour la tâche\n";
                $prompt .= "- description: une description détaillée de la tâche\n";
                $prompt .= "- priority: la priorité (basse, moyenne, haute, urgente)\n";
                $prompt .= "- estimated_time: le temps estimé en minutes (nombre entier)\n";
                $prompt .= "- tags: un tableau de tags pertinents\n";
                $prompt .= "Ne mets aucun texte avant ou après le JSON. Assure-toi que le JSON est valide.";

                // Appel à l'API Hugging Face avec un modèle gratuit
                $response = Http::withHeaders([
                    'Authorization' => 'Bearer ' . $huggingFaceApiKey,
                    'Content-Type' => 'application/json',
                ])->post('https://api-inference.huggingface.co/models/mistralai/Mixtral-8x7B-Instruct-v0.1', [
                    'inputs' => $prompt,
                    'parameters' => [
                        'max_new_tokens' => 800,
                        'temperature' => 0.7,
                        'return_full_text' => false
                    ]
                ]);

                // Vérifier si la réponse est valide
                if ($response->failed()) {
                    Log::error('Erreur Hugging Face: ' . $response->body());
                    // Passer au mode local si l'API échoue
                    return $this->generateTaskLocally($request);
                }

                // Extraire la réponse
                $responseData = $response->json();
                $content = $responseData[0]['generated_text'] ?? '';

                Log::info('Réponse Hugging Face brute: ' . $content);

                // Nettoyer la réponse pour extraire uniquement le JSON
                $content = preg_replace('/\`\`\`json\s*|\s*\`\`\`/', '', $content);
                $content = trim($content);

                // Essayer d'extraire le JSON de la réponse
                preg_match('/\{.*\}/s', $content, $matches);

                if (!empty($matches)) {
                    $jsonContent = $matches[0];
                    Log::info('JSON extrait: ' . $jsonContent);

                    $taskData = json_decode($jsonContent, true);

                    if (json_last_error() !== JSON_ERROR_NONE) {
                        Log::error('Erreur de décodage JSON: ' . json_last_error_msg() . ' - Contenu: ' . $jsonContent);
                        return $this->generateTaskLocally($request);
                    }

                    // Créer la tâche avec les données générées par l'IA
                    $task = [
                        'column_id' => $request->column_id,
                        'title' => $taskData['title'] ?? substr($request->description, 0, 60),
                        'description' => $taskData['description'] ?? $request->description,
                        'status' => 'à_faire',
                        'priority' => $taskData['priority'] ?? 'moyenne',
                        'estimated_time' => intval($taskData['estimated_time'] ?? 60),
                        'actual_time' => 0,
                        'timer_active' => true,
                        'tags' => $taskData['tags'] ?? ['généré_par_ia'],
                        'creator_id' => $request->creator_id,
                    ];

                    // Créer la tâche via le TaskController
                    $taskController = new TaskController();
                    $taskRequest = new Request($task);
                    $result = $taskController->store($taskRequest);

                    return $result;
                } else {
                    Log::error('Pas de JSON trouvé dans la réponse Hugging Face');
                    return $this->generateTaskLocally($request);
                }
            } else {
                // Si pas de clé API, utiliser le mode local
                return $this->generateTaskLocally($request);
            }
        } catch (\Exception $e) {
            Log::error('Exception lors de la génération de tâche: ' . $e->getMessage(), [
                'file' => $e->getFile(),
                'line' => $e->getLine(),
                'trace' => $e->getTraceAsString()
            ]);

            // En cas d'erreur, utiliser le mode local
            return $this->generateTaskLocally($request);
        }
    }

    /**
     * Chatbot pour discuter avec l'IA
     */
    public function chat(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'message' => 'required|string',
            'conversation_history' => 'nullable|array',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        try {
            // Récupérer la clé API Hugging Face depuis les variables d'environnement
            $huggingFaceApiKey = env('HUGGINGFACE_API_KEY');

            if (!$huggingFaceApiKey) {
                return response()->json([
                    'message' => 'Mode local: Clé API Hugging Face non configurée',
                    'response' => 'Je suis désolé, je ne peux pas vous aider sans une clé API. Veuillez configurer une clé API Hugging Face dans le fichier .env.'
                ]);
            }

            // Construire l'historique de conversation
            $conversationHistory = $request->input('conversation_history', []);

            // Vérifier et nettoyer l'historique de conversation
            if (!is_array($conversationHistory)) {
                $conversationHistory = [];
            }

            // Limiter l'historique aux 10 derniers messages pour éviter les problèmes de taille
            if (count($conversationHistory) > 10) {
                $conversationHistory = array_slice($conversationHistory, -10);
            }

            // Préparer le prompt pour l'IA
            $systemPrompt = "Tu es un assistant de gestion de projet professionnel et utile. Tu aides à organiser les tâches, à estimer les temps et à planifier les projets. Réponds de manière concise et professionnelle.";

            // Construire le prompt complet avec l'historique
            $fullPrompt = "<s>[INST] " . $systemPrompt . " [/INST]</s>\n\n";

            // Ajouter l'historique de conversation dans un format que Mixtral comprend mieux
            foreach ($conversationHistory as $message) {
                if (isset($message['role']) && isset($message['content'])) {
                    if ($message['role'] === 'user') {
                        $fullPrompt .= "<s>[INST] " . $message['content'] . " [/INST]</s>\n";
                    } else if ($message['role'] === 'assistant') {
                        $fullPrompt .= $message['content'] . "\n";
                    }
                }
            }

            // Ajouter le message actuel de l'utilisateur
            $fullPrompt .= "<s>[INST] " . $request->message . " [/INST]</s>";

            // Enregistrer le prompt complet pour le débogage
            Log::info('Prompt complet pour le chat:', ['prompt' => $fullPrompt]);

            // Appel à l'API Hugging Face avec des paramètres ajustés
            $response = Http::withHeaders([
                'Authorization' => 'Bearer ' . $huggingFaceApiKey,
                'Content-Type' => 'application/json',
            ])->post('https://api-inference.huggingface.co/models/mistralai/Mixtral-8x7B-Instruct-v0.1', [
                'inputs' => $fullPrompt,
                'parameters' => [
                    'max_new_tokens' => 300,
                    'temperature' => 0.5,  // Température réduite pour des réponses plus déterministes
                    'top_p' => 0.9,        // Contrôle la diversité
                    'do_sample' => true,
                    'return_full_text' => false
                ]
            ]);

            if ($response->failed()) {
                Log::error('Erreur Hugging Face (chat): ' . $response->body());

                // Réponse de secours en cas d'erreur
                return response()->json([
                    'message' => 'Mode local: API Hugging Face indisponible',
                    'response' => 'Je suis désolé, je ne peux pas accéder à l\'API en ce moment. Veuillez réessayer plus tard ou vérifier votre clé API.',
                    'conversation_history' => array_merge($conversationHistory, [
                        ['role' => 'user', 'content' => $request->message],
                        ['role' => 'assistant', 'content' => 'Je suis désolé, je ne peux pas accéder à l\'API en ce moment. Veuillez réessayer plus tard ou vérifier votre clé API.']
                    ])
                ]);
            }

            $responseData = $response->json();

            // Vérifier si la réponse a la structure attendue
            if (!isset($responseData[0]['generated_text'])) {
                Log::error('Réponse Hugging Face inattendue:', ['response' => $responseData]);

                // Réponse de secours en cas de format inattendu
                return response()->json([
                    'message' => 'Format de réponse inattendu',
                    'response' => 'Je suis désolé, j\'ai reçu une réponse dans un format inattendu. Veuillez réessayer.',
                    'conversation_history' => array_merge($conversationHistory, [
                        ['role' => 'user', 'content' => $request->message],
                        ['role' => 'assistant', 'content' => 'Je suis désolé, j\'ai reçu une réponse dans un format inattendu. Veuillez réessayer.']
                    ])
                ]);
            }

            $aiResponse = $responseData[0]['generated_text'];

            // Mettre à jour l'historique de conversation
            $updatedHistory = array_merge($conversationHistory, [
                ['role' => 'user', 'content' => $request->message],
                ['role' => 'assistant', 'content' => $aiResponse]
            ]);

            return response()->json([
                'message' => 'Réponse générée avec succès',
                'response' => $aiResponse,
                'conversation_history' => $updatedHistory
            ]);
        } catch (\Exception $e) {
            Log::error('Exception lors du chat: ' . $e->getMessage(), [
                'file' => $e->getFile(),
                'line' => $e->getLine(),
                'trace' => $e->getTraceAsString()
            ]);

            // Réponse en cas d'exception
            return response()->json([
                'message' => 'Erreur interne du serveur',
                'response' => 'Je suis désolé, une erreur est survenue. Veuillez réessayer plus tard.',
                'conversation_history' => array_merge(
                    is_array($request->input('conversation_history', [])) ? $request->input('conversation_history', []) : [],
                    [
                        ['role' => 'user', 'content' => $request->message],
                        ['role' => 'assistant', 'content' => 'Je suis désolé, une erreur est survenue. Veuillez réessayer plus tard.']
                    ]
                )
            ]);
        }
    }

    /**
     * Générer une tâche localement sans API externe
     */
    private function generateTaskLocally(Request $request)
    {
        Log::info('Génération locale de tâche', ['description' => $request->description]);

        // Extraire un titre intelligent à partir de la description
        $title = $this->extractTitle($request->description);

        // Analyser la description pour extraire des informations
        $assigneeName = $this->extractAssigneeName($request->description);
        $taskType = $this->extractTaskType($request->description);

        // Créer une description améliorée
        $enhancedDescription = $request->description;
        if ($assigneeName) {
            $enhancedDescription .= "\n\nAssigné à: " . $assigneeName;
        }
        if ($taskType) {
            $enhancedDescription .= "\n\nType de tâche: " . $taskType;
        }

        // Créer une tâche factice basée sur la description
        $task = [
            'column_id' => $request->column_id,
            'title' => $title,
            'description' => $enhancedDescription,
            'status' => 'à_faire',
            'priority' => $this->determinePriority($request->description),
            'estimated_time' => $this->estimateTime($request->description),
            'actual_time' => 0,
            'timer_active' => true,
            'tags' => $this->extractTags($request->description),
            'creator_id' => $request->creator_id,
        ];

        // Créer la tâche via le TaskController
        $taskController = new TaskController();
        $taskRequest = new Request($task);
        $result = $taskController->store($taskRequest);

        return $result;
    }

    /**
     * Extraire un titre intelligent à partir de la description
     */
    private function extractTitle($description)
    {
        // Rechercher explicitement un titre dans la description
        if (preg_match('/\btitle\s*[:=]\s*([^.,;!?\n]+)/i', $description, $matches)) {
            return ucfirst(trim($matches[1]));
        }

        // Rechercher des mots-clés comme "créer", "développer", "implémenter", etc.
        $actionKeywords = ['créer', 'développer', 'implémenter', 'concevoir', 'ajouter', 'modifier', 'corriger', 'tester', 'optimiser'];

        // Rechercher des phrases qui commencent par ces mots-clés
        foreach ($actionKeywords as $keyword) {
            if (preg_match('/\b' . $keyword . '\s+([^.!?]+[.!?]?)/i', $description, $matches)) {
                // Limiter à 60 caractères
                return substr(ucfirst(trim($matches[0])), 0, 60) . (strlen($matches[0]) > 60 ? '...' : '');
            }
        }

        // Si aucun mot-clé n'est trouvé, chercher la première phrase
        if (preg_match('/^([^.!?]+[.!?])/i', $description, $matches)) {
            return substr(ucfirst(trim($matches[0])), 0, 60) . (strlen($matches[0]) > 60 ? '...' : '');
        }

        // Si tout échoue, utiliser les premiers mots de la description
        $words = explode(' ', $description);
        $shortTitle = implode(' ', array_slice($words, 0, 5));
        return substr(ucfirst(trim($shortTitle)), 0, 60) . (count($words) > 5 ? '...' : '');
    }

    /**
     * Extraire le nom de l'assigné à partir de la description
     */
    private function extractAssigneeName($description)
    {
        // Rechercher des patterns comme "assigner à [nom]" ou "assigné à [nom]"
        if (preg_match('/\bassign(?:er|é|e)\s+(?:à|a)\s+([A-Z][a-z]+(?: [A-Z][a-z]+)*)/i', $description, $matches)) {
            return $matches[1];
        }

        return null;
    }

    /**
     * Extraire le type de tâche à partir de la description
     */
    private function extractTaskType($description)
    {
        $description = strtolower($description);

        if (strpos($description, 'page') !== false && (strpos($description, 'login') !== false || strpos($description, 'connexion') !== false)) {
            return 'Page de connexion';
        } elseif (strpos($description, 'page') !== false && (strpos($description, 'register') !== false || strpos($description, 'inscription') !== false)) {
            return 'Page d\'inscription';
        } elseif (strpos($description, 'api') !== false || strpos($description, 'endpoint') !== false) {
            return 'Développement API';
        } elseif (strpos($description, 'bug') !== false || strpos($description, 'erreur') !== false) {
            return 'Correction de bug';
        } elseif (strpos($description, 'test') !== false) {
            return 'Tests';
        } elseif (strpos($description, 'documentation') !== false || strpos($description, 'doc') !== false) {
            return 'Documentation';
        }

        return null;
    }

    /**
     * Déterminer la priorité en fonction du contenu de la description
     */
    private function determinePriority($description)
    {
        $description = strtolower($description);

        if (strpos($description, 'urgent') !== false || strpos($description, 'critique') !== false) {
            return 'urgente';
        } elseif (strpos($description, 'important') !== false || strpos($description, 'prioritaire') !== false) {
            return 'haute';
        } elseif (strpos($description, 'simple') !== false || strpos($description, 'facile') !== false) {
            return 'basse';
        }

        return 'moyenne';
    }

    /**
     * Estimer le temps en fonction de la complexité de la description
     */
    private function estimateTime($description)
    {
        // Rechercher explicitement une estimation de temps dans la description
        if (preg_match('/\bestim(?:ation|é)\s*[:=]\s*(\d+)\s*(?:min|h|heure|jour)/i', $description, $matches)) {
            $value = intval($matches[1]);
            if (strpos(strtolower($matches[0]), 'h') !== false || strpos(strtolower($matches[0]), 'heure') !== false) {
                return $value * 60; // Convertir les heures en minutes
            } elseif (strpos(strtolower($matches[0]), 'jour') !== false) {
                return $value * 480; // Convertir les jours en minutes (8h par jour)
            }
            return $value; // Minutes
        }

        $length = strlen($description);
        $complexity = 0;

        // Analyser la complexité basée sur des mots-clés
        $complexityKeywords = [
            'complexe' => 2,
            'difficile' => 2,
            'simple' => -1,
            'facile' => -1,
            'rapide' => -1,
            'long' => 1,
            'détaillé' => 1,
            'approfondi' => 2
        ];

        foreach ($complexityKeywords as $keyword => $value) {
            if (strpos(strtolower($description), $keyword) !== false) {
                $complexity += $value;
            }
        }

        // Base de temps en fonction de la longueur
        if ($length > 300) {
            $baseTime = 240; // 4h pour les tâches longues
        } elseif ($length > 150) {
            $baseTime = 120; // 2h pour les tâches moyennes
        } elseif ($length < 50) {
            $baseTime = 30; // 30min pour les tâches courtes
        } else {
            $baseTime = 60; // 1h par défaut
        }

        // Ajuster en fonction de la complexité
        return max(15, $baseTime + ($complexity * 30)); // Minimum 15 minutes
    }

    /**
     * Extraire des tags potentiels de la description
     */
    private function extractTags($description)
    {
        $description = strtolower($description);
        $tags = [];

        $commonTags = [
            'design',
            'développement',
            'backend',
            'frontend',
            'test',
            'debug',
            'ux',
            'ui',
            'documentation',
            'optimisation',
            'api',
            'database',
            'sécurité',
            'performance',
            'mobile',
            'responsive',
            'login',
            'authentification',
            'formulaire'
        ];

        foreach ($commonTags as $tag) {
            if (strpos($description, $tag) !== false) {
                $tags[] = $tag;
            }
        }

        // Ajouter des tags spécifiques basés sur des patterns
        if (strpos($description, 'page') !== false && (strpos($description, 'login') !== false || strpos($description, 'connexion') !== false)) {
            $tags[] = 'authentification';
        }

        if (strpos($description, 'base de données') !== false || strpos($description, 'database') !== false || strpos($description, 'sql') !== false) {
            $tags[] = 'database';
        }

        // Ajouter le tag généré_par_ia
        $tags[] = 'généré_par_ia';

        return array_unique($tags);
    }
}
