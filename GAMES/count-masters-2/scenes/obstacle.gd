extends Area3D

@export_enum("spikes", "saw", "pendulum") var type: String = "spikes"
@export var speed: float = 2.0
@export var movement_range: float = 3.0
@export var is_popup_spike: bool = false

# Visual nodes
@onready var spikes_visual: Node3D = $SpikesVisual
@onready var saw_visual: Node3D = $SawVisual
@onready var pendulum_visual: Node3D = $PendulumVisual

# Keep track of local time for animation offsets
var time_passed: float = 0.0

func _ready() -> void:
	time_passed = randf() * 100.0 # Randomize offset so obstacles aren't synced
	
	# Show/hide correct visuals
	spikes_visual.visible = (type == "spikes")
	saw_visual.visible = (type == "saw")
	pendulum_visual.visible = (type == "pendulum")
	
	# Connect overlap signal
	area_entered.connect(_on_area_entered)
	
	# Apply styling materials
	apply_obstacle_materials()

func apply_obstacle_materials() -> void:
	# Metal / Danger Neon Red colors
	var hazard_mat = StandardMaterial3D.new()
	hazard_mat.albedo_color = Color(0.9, 0.1, 0.1)
	hazard_mat.roughness = 0.2
	hazard_mat.metallic = 0.8
	hazard_mat.emission_enabled = true
	hazard_mat.emission = Color(0.5, 0.0, 0.0)
	hazard_mat.emission_energy_multiplier = 1.0
	
	var frame_mat = StandardMaterial3D.new()
	frame_mat.albedo_color = Color(0.3, 0.3, 0.3)
	frame_mat.metallic = 0.7
	frame_mat.roughness = 0.4
	
	if type == "spikes":
		for child in spikes_visual.get_children():
			if child is MeshInstance3D:
				child.set_surface_override_material(0, hazard_mat)
	elif type == "saw":
		var blade = saw_visual.get_node_or_null("Blade")
		if blade: blade.set_surface_override_material(0, hazard_mat)
		var shaft = saw_visual.get_node_or_null("Shaft")
		if shaft: shaft.set_surface_override_material(0, frame_mat)
	elif type == "pendulum":
		var blade = pendulum_visual.get_node_or_null("Arm/Axe")
		if blade: blade.set_surface_override_material(0, hazard_mat)
		var shaft = pendulum_visual.get_node_or_null("Arm/Shaft")
		if shaft: shaft.set_surface_override_material(0, frame_mat)

func _physics_process(delta: float) -> void:
	time_passed += delta * speed
	
	match type:
		"saw":
			# Spin the blade
			var blade = saw_visual.get_node_or_null("Blade")
			if blade:
				blade.rotate_y(15.0 * delta)
				
			# Slide left/right
			position.x = sin(time_passed) * movement_range
			
		"pendulum":
			# Swing left/right in rotation
			var arm = pendulum_visual.get_node_or_null("Arm")
			if arm:
				arm.rotation.z = sin(time_passed) * 1.2 # Swing angle up to ~70 degrees
				
		"spikes":
			if is_popup_spike:
				# Pop up and down periodically
				var cycle = sin(time_passed)
				if cycle > 0.1:
					# Fully up
					spikes_visual.position.y = lerp(spikes_visual.position.y, 0.0, 10.0 * delta)
					monitoring = true
				else:
					# Retracted below ground
					spikes_visual.position.y = lerp(spikes_visual.position.y, -0.6, 10.0 * delta)
					monitoring = false # Don't kill when retracted

func _on_area_entered(area: Area3D) -> void:
	# If a player stickman enters, kill it
	if area.has_method("die") and area.get("is_enemy") == false:
		area.die()
