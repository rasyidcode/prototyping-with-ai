extends Light3D

@export var min_energy: float = 0.05
@export var flicker_chance: float = 0.2
@export var play_audio: bool = true

var default_energy: float = 1.0
var audio_player: AudioStreamPlayer3D = null
var timer: Timer = null

func _ready() -> void:
	default_energy = light_energy
	
	if play_audio:
		audio_player = AudioStreamPlayer3D.new()
		audio_player.stream = preload("res://sounds/flashlight_click.wav")
		audio_player.volume_db = -12.0
		audio_player.max_distance = 10.0
		add_child(audio_player)
		
	timer = Timer.new()
	timer.wait_time = 0.08
	timer.autostart = true
	timer.timeout.connect(_on_timer_timeout)
	add_child(timer)

func _on_timer_timeout() -> void:
	if randf() < flicker_chance:
		# Flicker state
		var target_energy = min_energy if light_energy > (default_energy * 0.5) else default_energy
		light_energy = target_energy
		
		# Play click sound for flicker
		if play_audio and audio_player and target_energy == min_energy:
			audio_player.pitch_scale = randf_range(0.45, 0.65)
			audio_player.play()
			
		# Set a random duration for next flicker check
		timer.wait_time = randf_range(0.04, 0.18)
	else:
		# Return to normal
		light_energy = lerp(light_energy, default_energy, 0.3)
		timer.wait_time = 0.08
