-- ================================================
--  CHATVOCAL - W&N PRODUCTION
--  Script Roblox : Envoi des positions au serveur
--
--  Installation :
--  1. Place ce script dans ServerScriptService
--  2. Active HttpService dans les paramètres du jeu
--     (Game Settings > Security > Allow HTTP Requests)
--  3. Modifie SERVER_URL, GAME_ID et API_KEY
-- ================================================

local HttpService  = game:GetService("HttpService")
local Players      = game:GetService("Players")
local RunService   = game:GetService("RunService")

-- ================================================
--  CONFIGURATION — À MODIFIER
-- ================================================

local SERVER_URL      = "https://ton-serveur.railway.app/api/positions"
--                       ^ Remplace par l'URL de ton serveur déployé

local GAME_ID         = "game_001"
--                       ^ Doit correspondre à un id dans config.js

local API_KEY         = "cle_secrete_001"
--                       ^ Doit correspondre à la apiKey dans config.js

local UPDATE_INTERVAL = 0.5
--                       ^ Fréquence d'envoi en secondes (0.5 = 2x par seconde)

-- ================================================
--  LOGIQUE D'ENVOI
-- ================================================

local lastUpdate = 0
local isRunning  = true

-- Collecte les positions de tous les joueurs connectés
local function collectPositions()
	local playersData = {}

	for _, player in ipairs(Players:GetPlayers()) do
		local character = player.Character
		if character then
			local root = character:FindFirstChild("HumanoidRootPart")
			if root then
				table.insert(playersData, {
					name = player.Name,
					x    = math.round(root.Position.X),
					y    = math.round(root.Position.Y),
					z    = math.round(root.Position.Z)
				})
			end
		end
	end

	return playersData
end

-- Envoie les positions au serveur CHATVOCAL
local function sendPositions(playersData)
	local body = HttpService:JSONEncode({
		gameId  = GAME_ID,
		apiKey  = API_KEY,
		players = playersData
	})

	local success, result = pcall(function()
		return HttpService:PostAsync(
			SERVER_URL,
			body,
			Enum.HttpContentType.ApplicationJson,
			false
		)
	end)

	if not success then
		warn("[CHATVOCAL] Erreur d'envoi : " .. tostring(result))
	end
end

-- Boucle principale
RunService.Heartbeat:Connect(function()
	if not isRunning then return end

	local now = tick()
	if now - lastUpdate < UPDATE_INTERVAL then return end
	lastUpdate = now

	local playersData = collectPositions()

	-- Pas besoin d'envoyer si personne n'est connecté
	if #playersData == 0 then return end

	-- Envoi en arrière-plan pour ne pas bloquer le jeu
	task.spawn(sendPositions, playersData)
end)

-- ================================================
--  NETTOYAGE
-- ================================================

game:BindToClose(function()
	isRunning = false
end)

print("[CHATVOCAL] ✅ Système de chat vocal de proximité démarré")
print("[CHATVOCAL] 🎮 Jeu : " .. GAME_ID)
print("[CHATVOCAL] 🌐 Serveur : " .. SERVER_URL)
