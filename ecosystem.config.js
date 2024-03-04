let interpreter;
if (process.platform === "win32") {
    interpreter = "/.bin/ts-node.cmd";
} else {
    interpreter = "./node_modules/.bin/ts-node";
}


module.exports = {
    apps: [{
        name: 'my-app',
        interpreter,
        interpreter_args: '-r tsconfig-paths/register',
        instance_var: 'INSTANCE_ID',
        instances: 1,
        exec_mode: 'cluster',
        cwd: './',
        script: './src/index.ts',
    }]
}
