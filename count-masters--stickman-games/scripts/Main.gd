extends Node3D

const CrowdScript = preload("res://scripts/Crowd.gd")
const GateScript = preload("res://scripts/Gate.gd")
const TrapScript = preload("res://scripts/Trap.gd")
const EnemyScript = preload("res://scripts/EnemyCrowd.gd")
const BossScript = preload("res://scripts/Boss.gd")

const TRACK_WIDTH = 8.0
const RUN_SPEED = 15.5
const STEER_SPEED = 15.0
const DRAG_SENSITIVITY = 0.018
const START_Z = 9.0
const FINISH_Z = -232.0
const SAVE_PATH = "user://count_masters_save.cfg"

var run_root: Node3D
var player: Crowd
var camera: Camera3D
var hud_layer: CanvasLayer
var count_label: Label
var coins_label: Label
var status_label: Label
var restart_button: Button
var start_upgrade_button: Button
var gate_upgrade_button: Button
var strength_upgrade_button: Button

var obstacles: Array = []
var state := "running"
var target_x := 0.0
var dragging := false
var coins := 0
var run_coins := 0
var upgrades: Dictionary = {"start": 0, "gate": 0, "strength": 0}
var level_index := 1
var rng := RandomNumberGenerator.new()


func _ready() -> void:
	if has_node("PreviewRoot"):
		get_node("PreviewRoot").queue_free()
	rng.randomize()
	_load_save()
	_build_world_shell()
	_build_ui()
	_start_run()


func _input(event: InputEvent) -> void:
	if event is InputEventMouseButton:
		var mouse_event: InputEventMouseButton = event as InputEventMouseButton
		dragging = mouse_event.pressed
	elif event is InputEventScreenTouch:
		var touch_event: InputEventScreenTouch = event as InputEventScreenTouch
		dragging = touch_event.pressed
	elif dragging and event is InputEventMouseMotion:
		var motion_event: InputEventMouseMotion = event as InputEventMouseMotion
		target_x = clampf(target_x + motion_event.relative.x * DRAG_SENSITIVITY, -TRACK_WIDTH * 0.5, TRACK_WIDTH * 0.5)
	elif dragging and event is InputEventScreenDrag:
		var drag_event: InputEventScreenDrag = event as InputEventScreenDrag
		target_x = clampf(target_x + drag_event.relative.x * DRAG_SENSITIVITY, -TRACK_WIDTH * 0.5, TRACK_WIDTH * 0.5)


func _physics_process(delta: float) -> void:
	if state != "running" or not player:
		return
	var key_axis: float = Input.get_axis("ui_left", "ui_right")
	if abs(key_axis) > 0.01:
		target_x = clampf(target_x + key_axis * delta * 7.0, -TRACK_WIDTH * 0.5, TRACK_WIDTH * 0.5)
	player.position.z -= RUN_SPEED * delta
	player.position.x = move_toward(player.position.x, target_x, STEER_SPEED * delta)
	_update_camera(delta)
	_check_obstacles()
	_update_hud()
	if player.count <= 0:
		_end_run(false, "Your army was wiped out")


func _build_world_shell() -> void:
	var env := WorldEnvironment.new()
	var environment := Environment.new()
	environment.background_mode = Environment.BG_COLOR
	environment.background_color = Color(0.55, 0.79, 0.98)
	environment.ambient_light_source = Environment.AMBIENT_SOURCE_COLOR
	environment.ambient_light_color = Color(0.9, 0.95, 1.0)
	environment.ambient_light_energy = 0.65
	env.environment = environment
	add_child(env)

	var sun := DirectionalLight3D.new()
	sun.light_energy = 2.4
	sun.rotation_degrees = Vector3(-48.0, -28.0, 0.0)
	add_child(sun)

	camera = Camera3D.new()
	camera.current = true
	camera.fov = 58.0
	add_child(camera)


func _build_ui() -> void:
	hud_layer = CanvasLayer.new()
	add_child(hud_layer)
	var root := Control.new()
	root.set_anchors_preset(Control.PRESET_FULL_RECT)
	hud_layer.add_child(root)

	count_label = _make_label(Vector2(24, 18), 34, Color.WHITE)
	root.add_child(count_label)
	coins_label = _make_label(Vector2(24, 60), 24, Color(1.0, 0.88, 0.25))
	root.add_child(coins_label)
	status_label = _make_label(Vector2(0, 0), 34, Color.WHITE)
	status_label.set_anchors_preset(Control.PRESET_CENTER_TOP)
	status_label.position = Vector2(-310, 20)
	status_label.size = Vector2(620, 80)
	status_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	root.add_child(status_label)

	var panel := PanelContainer.new()
	panel.position = Vector2(24, 500)
	panel.size = Vector2(380, 178)
	root.add_child(panel)
	var box := VBoxContainer.new()
	box.add_theme_constant_override("separation", 8)
	panel.add_child(box)
	var title := Label.new()
	title.text = "UPGRADES"
	title.add_theme_font_size_override("font_size", 18)
	box.add_child(title)
	start_upgrade_button = _make_button()
	gate_upgrade_button = _make_button()
	strength_upgrade_button = _make_button()
	box.add_child(start_upgrade_button)
	box.add_child(gate_upgrade_button)
	box.add_child(strength_upgrade_button)
	start_upgrade_button.pressed.connect(_buy_start_upgrade)
	gate_upgrade_button.pressed.connect(_buy_gate_upgrade)
	strength_upgrade_button.pressed.connect(_buy_strength_upgrade)

	restart_button = Button.new()
	restart_button.text = "Retry Run"
	restart_button.position = Vector2(0, 118)
	restart_button.size = Vector2(220, 54)
	restart_button.set_anchors_preset(Control.PRESET_CENTER_TOP)
	restart_button.pressed.connect(_start_run)
	root.add_child(restart_button)


func _make_label(pos: Vector2, font_size: int, color: Color) -> Label:
	var label := Label.new()
	label.position = pos
	label.size = Vector2(520, 40)
	label.add_theme_font_size_override("font_size", font_size)
	label.add_theme_color_override("font_color", color)
	label.add_theme_color_override("font_shadow_color", Color(0.0, 0.0, 0.0, 0.65))
	label.add_theme_constant_override("shadow_offset_x", 2)
	label.add_theme_constant_override("shadow_offset_y", 2)
	return label


func _make_button() -> Button:
	var button := Button.new()
	button.custom_minimum_size = Vector2(340, 34)
	return button


func _start_run() -> void:
	if run_root:
		run_root.queue_free()
	run_root = Node3D.new()
	run_root.name = "RunRoot"
	add_child(run_root)
	obstacles.clear()
	state = "running"
	target_x = 0.0
	run_coins = 0
	status_label.text = "Choose the strongest gates"
	restart_button.visible = false
	_build_track()
	_spawn_player()
	_spawn_course()
	_update_hud()


func _build_track() -> void:
	var road_mat := _mat(Color(0.20, 0.24, 0.28), 0.62)
	var side_mat := _mat(Color(0.16, 0.72, 0.42), 0.7)
	var stripe_mat := _mat(Color(1.0, 0.82, 0.18), 0.45)
	var road := _box(Vector3(0.0, -0.04, (START_Z + FINISH_Z) * 0.5), Vector3(TRACK_WIDTH + 1.1, 0.08, abs(FINISH_Z - START_Z) + 24.0), road_mat)
	run_root.add_child(road)
	for x in [-TRACK_WIDTH * 0.5 - 1.6, TRACK_WIDTH * 0.5 + 1.6]:
		run_root.add_child(_box(Vector3(x, -0.06, (START_Z + FINISH_Z) * 0.5), Vector3(2.1, 0.06, abs(FINISH_Z - START_Z) + 24.0), side_mat))
	for z in range(int(START_Z), int(FINISH_Z), -14):
		run_root.add_child(_box(Vector3(0.0, 0.012, float(z)), Vector3(0.22, 0.03, 4.2), stripe_mat))
	_build_castle(Vector3(0.0, 0.0, FINISH_Z - 7.5))


func _spawn_player() -> void:
	player = CrowdScript.new()
	player.name = "PlayerCrowd"
	player.position = Vector3(0.0, 0.0, START_Z)
	player.setup(14 + int(upgrades["start"]) * 5, Color(0.12, 0.56, 1.0), false)
	run_root.add_child(player)
	_update_camera(1.0)


func _spawn_course() -> void:
	var z := -12.0
	_spawn_gate_pair(z, [ ["+", 12, false], ["x", 2, false] ])
	z -= 18.0
	_spawn_trap(Vector3(-2.4, 0.0, z), 9)
	_spawn_trap(Vector3(2.3, 0.0, z - 2.5), 7)
	z -= 17.0
	_spawn_gate_pair(z, [ ["-", 18, true], ["+", 28, false] ])
	z -= 20.0
	_spawn_enemy(Vector3(0.0, 0.0, z), 34 + level_index * 2, 2.5, 1.4)
	z -= 20.0
	_spawn_gate_pair(z, [ ["x", 3, false], ["/", 2, true] ])
	z -= 19.0
	_spawn_trap(Vector3(0.0, 0.0, z), 13, 1.4)
	z -= 18.0
	_spawn_gate_pair(z, [ ["+", 45, false], ["-", 35, true] ])
	z -= 19.0
	_spawn_enemy(Vector3(-1.0, 0.0, z), 58 + level_index * 5, 3.0, 1.8)
	z -= 19.0
	_spawn_gate_pair(z, [ ["/", 3, true], ["x", 2, false] ])
	z -= 18.0
	_spawn_trap(Vector3(-2.7, 0.0, z), 15)
	_spawn_trap(Vector3(2.7, 0.0, z - 3.0), 15)
	z -= 21.0
	_spawn_enemy(Vector3(1.2, 0.0, z), 78 + level_index * 7, 2.7, 2.2)
	z -= 24.0
	_spawn_boss(Vector3(0.0, 0.0, z), 120 + level_index * 18 - int(upgrades["strength"]) * 10)
	_spawn_finish(Vector3(0.0, 0.0, FINISH_Z))


func _spawn_gate_pair(z: float, specs: Array) -> void:
	var xs: Array[float] = [-2.15, 2.15]
	for i in range(specs.size()):
		var spec: Array = specs[i]
		var gate: Gate = GateScript.new()
		gate.position = Vector3(xs[i], 0.0, z)
		gate.configure(str(spec[0]), int(spec[1]), bool(spec[2]))
		run_root.add_child(gate)
		obstacles.append(gate)


func _spawn_trap(pos: Vector3, damage: int, hit_radius: float = 1.05) -> void:
	var trap: Trap = TrapScript.new()
	trap.position = pos
	trap.configure(damage, hit_radius)
	run_root.add_child(trap)
	obstacles.append(trap)


func _spawn_enemy(pos: Vector3, enemy_count: int, patrol: float, speed: float) -> void:
	var enemy: EnemyCrowd = EnemyScript.new()
	enemy.position = pos
	enemy.configure(enemy_count, Color(1.0, 0.18, 0.16), patrol, speed)
	run_root.add_child(enemy)
	obstacles.append(enemy)


func _spawn_boss(pos: Vector3, health: int) -> void:
	var boss: Boss = BossScript.new()
	boss.position = pos
	boss.configure(maxi(70, health))
	run_root.add_child(boss)
	obstacles.append(boss)


func _spawn_finish(pos: Vector3) -> void:
	var finish := Node3D.new()
	finish.name = "Finish"
	finish.position = pos
	run_root.add_child(finish)
	obstacles.append(finish)
	var mat := _mat(Color(1.0, 0.85, 0.12), 0.35)
	run_root.add_child(_box(pos + Vector3(0.0, 0.65, 0.0), Vector3(TRACK_WIDTH, 1.3, 0.18), mat))
	var text := MeshInstance3D.new()
	var text_mesh := TextMesh.new()
	text_mesh.text = "CASTLE"
	text_mesh.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	text_mesh.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
	text_mesh.font_size = 64
	text_mesh.depth = 0.04
	text.mesh = text_mesh
	text.position = pos + Vector3(0.0, 1.9, 0.2)
	text.material_override = _mat(Color.WHITE, 0.4)
	run_root.add_child(text)


func _check_obstacles() -> void:
	for item in obstacles:
		if not is_instance_valid(item):
			continue
		if item is Gate:
			_check_gate(item)
		elif item is Trap:
			_check_trap(item)
		elif item is EnemyCrowd:
			_check_enemy(item)
		elif item is Boss:
			_check_boss(item)
		elif item is Node3D and item.name == "Finish":
			if player.position.z <= item.position.z:
				_end_run(true, "Castle claimed")


func _check_gate(gate: Gate) -> void:
	if gate.consumed:
		return
	if abs(player.position.z - gate.position.z) < 1.0 and abs(player.position.x - gate.position.x) < gate.width * 0.5:
		var before := player.count
		player.set_count(gate.apply_to(before, int(upgrades["gate"]) * 2))
		player.pulse()
		if player.count > before:
			run_coins += 3 + int((player.count - before) * 0.08)
			status_label.text = "Army grew to " + str(player.count)
		else:
			status_label.text = "Bad gate hit: " + str(player.count) + " left"


func _check_trap(trap: Trap) -> void:
	if trap.consumed:
		return
	if abs(player.position.z - trap.position.z) < trap.radius and abs(player.position.x - trap.position.x) < trap.radius + player.radius * 0.25:
		var before := player.count
		player.set_count(trap.trigger(before))
		player.pulse()
		status_label.text = "Trap lost " + str(before - player.count)


func _check_enemy(enemy: EnemyCrowd) -> void:
	if enemy.defeated:
		return
	var reach: float = maxf(1.15, player.radius * 0.45 + enemy.radius * 0.45)
	if abs(player.position.z - enemy.position.z) < reach and abs(player.position.x - enemy.position.x) < reach:
		var result: Dictionary = enemy.fight(player.count + int(upgrades["strength"]) * 3)
		player.set_count(int(result["player"]))
		player.pulse()
		if bool(result["won"]):
			run_coins += 12
			status_label.text = "Enemy crowd defeated"
		else:
			status_label.text = "Outnumbered by rivals"


func _check_boss(boss: Boss) -> void:
	if boss.defeated:
		return
	if abs(player.position.z - boss.position.z) < boss.radius and abs(player.position.x - boss.position.x) < boss.radius:
		var result: Dictionary = boss.fight(player.count + int(upgrades["strength"]) * 4)
		player.set_count(int(result["player"]))
		player.pulse()
		if bool(result["won"]):
			run_coins += 50
			status_label.text = "King-stickman defeated"
		else:
			_end_run(false, "The King-stickman held the castle")


func _end_run(won: bool, message: String) -> void:
	if state != "running":
		return
	state = "won" if won else "lost"
	var bonus: int = maxi(0, player.count / 3) if player else 0
	if won:
		run_coins += 40 + bonus
		level_index += 1
	else:
		run_coins += maxi(4, bonus)
	coins += run_coins
	_save()
	status_label.text = message + "  +" + str(run_coins) + " coins"
	restart_button.text = "Next Run" if won else "Retry Run"
	restart_button.visible = true
	_update_hud()


func _update_camera(delta: float) -> void:
	if not camera or not player:
		return
	var desired := Vector3(player.position.x * 0.25, 8.4, player.position.z + 12.2)
	camera.position = camera.position.lerp(desired, minf(1.0, delta * 5.0))
	camera.look_at(player.position + Vector3(0.0, 0.9, -5.0), Vector3.UP)


func _update_hud() -> void:
	if player:
		count_label.text = "ARMY " + str(player.count)
	coins_label.text = "COINS " + str(coins) + "  RUN +" + str(run_coins)
	start_upgrade_button.text = "Starting crowd Lv " + str(upgrades["start"]) + "  Cost " + str(_upgrade_cost("start"))
	gate_upgrade_button.text = "Gate bonus Lv " + str(upgrades["gate"]) + "  Cost " + str(_upgrade_cost("gate"))
	strength_upgrade_button.text = "Strength Lv " + str(upgrades["strength"]) + "  Cost " + str(_upgrade_cost("strength"))
	start_upgrade_button.disabled = coins < _upgrade_cost("start") or state == "running"
	gate_upgrade_button.disabled = coins < _upgrade_cost("gate") or state == "running"
	strength_upgrade_button.disabled = coins < _upgrade_cost("strength") or state == "running"


func _buy_start_upgrade() -> void:
	_buy_upgrade("start")


func _buy_gate_upgrade() -> void:
	_buy_upgrade("gate")


func _buy_strength_upgrade() -> void:
	_buy_upgrade("strength")


func _buy_upgrade(key: String) -> void:
	var cost := _upgrade_cost(key)
	if coins < cost or state == "running":
		return
	coins -= cost
	upgrades[key] = int(upgrades[key]) + 1
	_save()
	_update_hud()


func _upgrade_cost(key: String) -> int:
	var costs: Dictionary = {"start": 45, "gate": 60, "strength": 75}
	var base: int = int(costs[key])
	return base + int(upgrades[key]) * 35


func _load_save() -> void:
	var cfg := ConfigFile.new()
	if cfg.load(SAVE_PATH) != OK:
		return
	coins = int(cfg.get_value("progress", "coins", 0))
	level_index = int(cfg.get_value("progress", "level", 1))
	upgrades["start"] = int(cfg.get_value("upgrades", "start", 0))
	upgrades["gate"] = int(cfg.get_value("upgrades", "gate", 0))
	upgrades["strength"] = int(cfg.get_value("upgrades", "strength", 0))


func _save() -> void:
	var cfg := ConfigFile.new()
	cfg.set_value("progress", "coins", coins)
	cfg.set_value("progress", "level", level_index)
	cfg.set_value("upgrades", "start", upgrades["start"])
	cfg.set_value("upgrades", "gate", upgrades["gate"])
	cfg.set_value("upgrades", "strength", upgrades["strength"])
	cfg.save(SAVE_PATH)


func _build_castle(pos: Vector3) -> void:
	var stone := _mat(Color(0.64, 0.66, 0.72), 0.7)
	var roof := _mat(Color(0.86, 0.16, 0.22), 0.45)
	for x in [-3.0, 3.0]:
		run_root.add_child(_box(pos + Vector3(x, 1.3, 0.0), Vector3(1.2, 2.6, 1.5), stone))
		run_root.add_child(_box(pos + Vector3(x, 3.0, 0.0), Vector3(1.45, 0.65, 1.75), roof))
	run_root.add_child(_box(pos + Vector3(0.0, 1.0, 0.0), Vector3(4.8, 2.0, 1.25), stone))
	run_root.add_child(_box(pos + Vector3(0.0, 0.55, 0.66), Vector3(1.15, 1.1, 0.18), _mat(Color(0.28, 0.16, 0.08), 0.65)))


func _box(pos: Vector3, size: Vector3, mat: Material) -> MeshInstance3D:
	var box := MeshInstance3D.new()
	var mesh := BoxMesh.new()
	mesh.size = size
	box.mesh = mesh
	box.position = pos
	box.material_override = mat
	return box


func _mat(color: Color, roughness: float) -> StandardMaterial3D:
	var mat := StandardMaterial3D.new()
	mat.albedo_color = color
	mat.roughness = roughness
	return mat
