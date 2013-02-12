var funstance = require('funstance');
var EventEmitter = require('events').EventEmitter;

module.exports = function (game, opts) {
    if (!opts) opts = {};
    if (!opts.limit) opts.limit = function () { return false };
    if (opts.yield === undefined) opts.yield = 4;
    if (typeof opts.yield !== 'function') {
        opts.yield = (function (y) {
            return function () { return y };
        })(opts.yield);
    }
    
    if (!opts.expire) opts.expire = {};
    if (typeof opts.expire === 'number') {
        opts.expire = { start : opts.expire, end : opts.expire };
    }
    if (!opts.expire.start) opts.expire.start = 15 * 1000;
    if (!opts.expire.end) opts.expire.end = 30 * 1000;
    if (!opts.power) opts.power = 1;
    if (!opts.radius) opts.radius = 1;
    
    game.on('collision', function (item) {
        if (!item._debris) return;
        if (opts.limit && opts.limit(item)) return;
        
        game.removeItem(item);
        item._collected = true;
        em.emit('collect', item);
    });
    
    var em = new EventEmitter;
    var explodeOneBlock = funstance(em, function (pos) {
        var value = game.getBlock(pos);
        if (value === 0) return;
        game.setBlock(pos, 0);
        
        for (var i = 0; i < opts.yield(value); i++) {
            var item = createDebris(game, pos, value);
            item.velocity = {
                x: (Math.random() * 2 - 1) * 0.05 * opts.power,
                y: (Math.random() * 2 - 1) * 0.05 * opts.power,
                z: (Math.random() * 2 - 1) * 0.05 * opts.power
            };
            game.addItem(item);
            
            var time = opts.expire.start + Math.random()
                * (opts.expire.end - opts.expire.start);
            
            setTimeout(function (item) {
                game.removeItem(item);
                if (!item._collected) em.emit('expire', item);
            }, time, item);
        }
    });

    function explodeWithRadius(pos) {
        var r = opts.radius;
        var r2 = r*r;

        for (var x=-r; x<=r; x++) {
            for (var y=-r; y<=r; y++) {
                for (var z=-r; z<=r; z++) {
                    var v = x*x+y*y+z*z;
                    var variation = Math.random()*0.5+0.5
                    if (v <= (r2*variation)) {
                        explodeOneBlock({x:pos.x+x*game.cubeSize, y:pos.y+y*game.cubeSize, z:pos.z+z*game.cubeSize})
                    }
                }
            }
        }
    }

    if (opts.radius <= 1) {
        return explodeOneBlock;
    } else {
        return explodeWithRadius;
    }
}

function createDebris (game, pos, value) {
    var mesh = new game.THREE.Mesh(
        new game.THREE.CubeGeometry(4, 4, 4),
        game.material
    );
    mesh.geometry.faces.forEach(function (face) {
        face.materialIndex = value - 1
    });
    mesh.translateX(pos.x);
    mesh.translateY(pos.y);
    mesh.translateZ(pos.z);
    
    return {
        mesh: mesh,
        size: 4,
        collisionRadius: 22,
        value: value,
        _debris: true,
        velocity: {
            x: (Math.random() * 2 - 1) * 0.05,
            y: (Math.random() * 2 - 1) * 0.05,
            z: (Math.random() * 2 - 1) * 0.05
        }
    };
}
