extends Crowd
class_name EnemyCrowd

var defeated := false
var patrol_width := 1.7
var patrol_speed := 1.2
var _base_x := 0.0
var _phase := 0.0


func configure(enemy_count: int, color: Color, width: float = 1.7, speed: float = 1.2) -> void:
	setup(enemy_count, color, true)
	patrol_width = width
	patrol_speed = speed


func _ready() -> void:
	super._ready()
	_base_x = position.x
	_phase = randf() * TAU


func _process(delta: float) -> void:
	super._process(delta)
	if not defeated:
		position.x = _base_x + sin(Time.get_ticks_msec() * 0.001 * patrol_speed + _phase) * patrol_width


func fight(player_count: int) -> Dictionary:
	defeated = true
	visible = false
	var survivors := player_count - count
	if survivors > 0:
		return {"player": survivors, "enemy": 0, "won": true}
	return {"player": 0, "enemy": abs(survivors), "won": false}
