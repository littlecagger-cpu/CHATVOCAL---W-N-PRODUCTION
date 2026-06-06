-- ================================================
--  CHATVOCAL - W&N PRODUCTION v3
--  Script Roblox : Positions + Vérification /verify
--
--  Installation :
--  1. Place ce script dans ServerScriptService
--  2. Game Settings > Security > Allow HTTP Requests ✅
--  3. Modifie SERVER_URL, GAME_ID et API_KEY
-- ================================================

local HttpService  = game:GetService("HttpService")
local Players      = game:GetService("Players")
local RunService   = game:GetService("RunService")

-- ================================================
--  CONFIGURATION — À MODIFIER
-- ================================================

local SERVER_URL      = "https://chatvocal-wn-production.onrender.com"
--                       ^ Ton URL Render (sans slash à la fin)

local GAME_ID         = "game_001"
local API_KEY         = "cle_secrete_001"
local UPDATE_INTERVAL = 0.5

-- ================================================
--  ENVOI DES POSITIONS
-- ================================================

local lastUpdate = 0

RunService.Heartbeat:Connect(function()
	local now = tick()
	if now - lastUpdate < UPDATE_INTERVAL then return end
	lastUpdate = now

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

	if #playersData == 0 then return end

	task.spawn(function()
		pcall(function()
			HttpService:PostAsync(
				SERVER_URL .. "/api/positions",
				HttpService:JSONEncode({ gameId = GAME_ID, apiKey = API_KEY, players = playersData }),
				Enum.HttpContentType.ApplicationJson
			)
		end)
	end)
end)

-- ================================================
--  VÉRIFICATION PAR CODE (/verify XXXXXX)
-- ================================================

local function handleVerifyCommand(player, code)
	task.spawn(function()
		local success, result = pcall(function()
			return HttpService:PostAsync(
				SERVER_URL .. "/api/verify",
				HttpService:JSONEncode({
					playerName = player.Name,
					code       = code,
					gameId     = GAME_ID,
					apiKey     = API_KEY
				}),
				Enum.HttpContentType.ApplicationJson
			)
		end)

		if success then
			local data = HttpService:JSONDecode(result)
			if data.success then
				-- Notifier le joueur dans le chat
				local hint = Instance.new("Hint")
				hint.Text   = "✅ CHATVOCAL : Compte vérifié ! Tu peux retourner sur le site."
				hint.Parent = workspace
				task.delay(4, function() hint:Destroy() end)
				print("[CHATVOCAL] ✅ " .. player.Name .. " vérifié avec succès")
			else
				local hint = Instance.new("Hint")
				hint.Text   = "❌ CHATVOCAL : Code incorrect ou expiré."
				hint.Parent = workspace
				task.delay(3, function() hint:Destroy() end)
			end
		else
			warn("[CHATVOCAL] Erreur vérification : " .. tostring(result))
		end
	end)
end

-- Écouter les messages de chat de chaque joueur
Players.PlayerAdded:Connect(function(player)
	player.Chatted:Connect(function(message)
		-- Détecter /verify XXXXXX (6 chiffres)
		local code = message:match("^/verify%s+(%d%d%d%d%d%d)$")
		if code then
			handleVerifyCommand(player, code)
		end
	end)
end)

-- Pour les joueurs déjà connectés au démarrage du script
for _, player in ipairs(Players:GetPlayers()) do
	player.Chatted:Connect(function(message)
		local code = message:match("^/verify%s+(%d%d%d%d%d%d)$")
		if code then
			handleVerifyCommand(player, code)
		end
	end)
end

print("[CHATVOCAL] ✅ Système démarré — v3 avec vérification /verify")
print("[CHATVOCAL] 🎮 Jeu : " .. GAME_ID .. " | Serveur : " .. SERVER_URL)
