extends Node

const GATE_PAIR_SCENE = preload("res://scenes/gate_pair.tscn")
const OBSTACLE_SCENE = preload("res://scenes/obstacle.tscn")
const ENEMY_SCENE = preload("res://scenes/enemy.tscn")
const COIN_SCENE = preload("res://scenes/coin.tscn")
const CASTLE_SCENE = preload("res://scenes/castle.tscn")

func generate_level(parent: Node3D, level_num: int) -> Dictionary:
	var info = {}
	
	# Determine track length based on level
	var length = 180.0 + min(level_num * 30.0, 320.0) # Length from 210 to 500
	info["length"] = length
	
	# 1. Build the Road Mesh
	var road_container = Node3D.new()
	road_container.name = "Road"
	parent.add_child(road_container)
	
	var road_mesh_inst = MeshInstance3D.new()
	var road_box = BoxMesh.new()
	road_box.size = Vector3(10.0, 0.4, length)
	road_mesh_inst.mesh = road_box
	road_mesh_inst.position = Vector3(0, -0.2, -length / 2.0)
	
	# Road Material (sleek dark carbon)
	var road_mat = StandardMaterial3D.new()
	road_mat.albedo_color = Color(0.12, 0.12, 0.15)
	road_mat.roughness = 0.9
	road_mat.metallic = 0.05
	road_mesh_inst.set_surface_override_material(0, road_mat)
	road_container.add_child(road_mesh_inst)
	
	# Left & Right Neon Borders
	var border_mat = StandardMaterial3D.new()
	border_mat.albedo_color = Color(0.0, 0.7, 1.0) # Cyan glowing line
	border_mat.emission_enabled = true
	border_mat.emission = Color(0.0, 0.7, 1.0)
	border_mat.emission_energy_multiplier = 1.5
	
	var left_border = MeshInstance3D.new()
	var border_box = BoxMesh.new()
	border_box.size = Vector3(0.12, 0.2, length)
	left_border.mesh = border_box
	left_border.position = Vector3(-5.0, 0.1, -length / 2.0)
	left_border.set_surface_override_material(0, border_mat)
	road_container.add_child(left_border)
	
	var right_border = MeshInstance3D.new()
	right_border.mesh = border_box
	right_border.position = Vector3(5.0, 0.1, -length / 2.0)
	right_border.set_surface_override_material(0, border_mat)
	road_container.add_child(right_border)
	
	# 2. Spawn gates, traps, enemies, and coins along the track
	var z_pos = -35.0
	var step_size = 28.0
	var pattern_index = 0
	
	while z_pos > -length + 45.0:
		# Alternate between patterns:
		# Pattern 0: Gate Pair
		# Pattern 1: Trap/Obstacle
		# Pattern 2: Enemy Crowd
		# Pattern 3: Trap + Coins
		var pattern = pattern_index % 4
		
		match pattern:
			0:
				# Spawn a Math Gate Pair
				var gate_pair = GATE_PAIR_SCENE.instantiate()
				gate_pair.position = Vector3(0, 0, z_pos)
				parent.add_child(gate_pair)
				
				# Generate math choices
				# Option A: Addition vs Multiplication (classic choice)
				# Option B: Multiplication vs Subtraction
				# Option C: Addition vs Division
				var choice_type = randi() % 3
				
				var op_l = "add"
				var val_l = 5.0
				var op_r = "add"
				var val_r = 5.0
				
				if choice_type == 0:
					# addition vs multiplication
					var add_val = int(randf_range(5, 12) + level_num * 1.5)
					var mult_val = 1.5 + randf_range(0, 0.5) + (level_num * 0.05)
					# Round multiplier to 1 decimal place
					mult_val = snapped(mult_val, 0.1)
					
					if randf() > 0.5:
						op_l = "add"; val_l = add_val
						op_r = "multiply"; val_r = mult_val
					else:
						op_l = "multiply"; val_l = mult_val
						op_r = "add"; val_r = add_val
				elif choice_type == 1:
					# positive addition vs negative subtraction (avoid trap gate vs take minor hit)
					var add_val = int(randf_range(8, 16) + level_num)
					var sub_val = int(randf_range(5, 10) + level_num)
					if randf() > 0.5:
						op_l = "add"; val_l = add_val
						op_r = "subtract"; val_r = sub_val
					else:
						op_l = "subtract"; val_l = sub_val
						op_r = "add"; val_r = add_val
				else:
					# multiplication vs division
					var mult_val = 2.0 + (level_num * 0.1)
					mult_val = snapped(mult_val, 0.5)
					var div_val = 2.0
					if randf() > 0.5:
						op_l = "multiply"; val_l = mult_val
						op_r = "divide"; val_r = div_val
					else:
						op_l = "divide"; val_l = div_val
						op_r = "multiply"; val_r = mult_val
						
				gate_pair.setup_pair(op_l, val_l, op_r, val_r)
				
			1, 3:
				# Spawn Obstacle/Trap
				var obstacle = OBSTACLE_SCENE.instantiate()
				obstacle.position = Vector3(0, 0, z_pos)
				
				# Choose type
				var types = ["spikes", "saw", "pendulum"]
				obstacle.type = types[randi() % types.size()]
				
				# Scale speeds slightly with level
				obstacle.speed = 2.0 + min(level_num * 0.2, 2.5)
				obstacle.movement_range = randf_range(2.0, 3.5)
				if obstacle.type == "spikes":
					# 50% chance of popup spikes
					obstacle.is_popup_spike = (randf() > 0.5)
					# Spikes can be offset left or right
					if not obstacle.is_popup_spike:
						obstacle.position.x = randf_range(-1.5, 1.5)
						
				parent.add_child(obstacle)
				
				# Spawn coins surrounding/behind the obstacle
				spawn_coins_line(parent, z_pos + 8.0, 3)
				
			2:
				# Spawn Enemy Crowd
				var enemy = ENEMY_SCENE.instantiate()
				# Vary count with level
				enemy.enemy_count = int(6 + level_num * 3.5)
				# Clamp to prevent lag
				enemy.enemy_count = min(enemy.enemy_count, 45)
				# Place static on track center
				enemy.position = Vector3(randf_range(-1.0, 1.0), 0, z_pos)
				parent.add_child(enemy)
				
		# Always spawn some path coins between steps to guide players
		if pattern != 2: # Don't spawn coins on top of enemies!
			spawn_coins_wave(parent, z_pos + step_size / 2.0)
			
		z_pos -= step_size
		pattern_index += 1
		
	# 3. Spawn Castle at the very end
	var castle = CASTLE_SCENE.instantiate()
	castle.position = Vector3(0, 0, -length)
	parent.add_child(castle)
	info["castle_instance"] = castle
	
	return info

func spawn_coins_line(parent: Node3D, z_center: float, count: int) -> void:
	var x_offset = randf_range(-2.0, 2.0)
	for i in range(count):
		var coin = COIN_SCENE.instantiate()
		coin.position = Vector3(x_offset, 0, z_center + (i * 1.5))
		parent.add_child(coin)

func spawn_coins_wave(parent: Node3D, z_center: float) -> void:
	var coin_count = 4
	var wave_amp = randf_range(1.5, 3.0)
	var wave_freq = randf_range(1.0, 2.0)
	
	for i in range(coin_count):
		var coin = COIN_SCENE.instantiate()
		var progress = float(i) / (coin_count - 1)
		var local_z = -2.0 + progress * 4.0
		var x = sin(progress * PI * wave_freq) * wave_amp
		coin.position = Vector3(x, 0, z_center + local_z)
		parent.add_child(coin)
