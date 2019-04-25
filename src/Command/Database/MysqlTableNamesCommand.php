<?php

namespace PubTech\Command\Database;

use mysqli;
use Symfony\Component\Console\Command\Command;
use Symfony\Component\Console\Input\InputInterface;
use Symfony\Component\Console\Output\OutputInterface;
use Symfony\Component\Console\Question\Question;

class MysqlTableNamesCommand extends Command
{
    private $description = "Produce a list of table names";
    public static $defaultName = "db:mysql:table-names";
    public function execute(InputInterface $input, OutputInterface $output)
    {
        $questionHelper = $this->getHelper('question');

        // DEBUG, DO NOT COMMIT

        $questions = [
          'host' => ['question' => 'Host: '],
          'username' => ['question' => 'Username: '],
          'password' => ['question' => 'Password: ', 'hidden' => true],
          'dbname' => ['question' => 'Database: '],
        ];

        $config = [
          'host' => "",
          'username' => "",
          'password' => "",
          'dbname' => ""
        ];

        foreach ($questions as $key=>$question) {
            $q = new Question($question['question']);
            if ($question['hidden'] ?? false) {
                $q->setHidden(true);
            }
            $config[$key] = $questionHelper->ask($input, $output, $q);
            if (empty($config[$key])) {
                $output->writeln("{$key} must not be empty");
                exit(1);
            }
        }

        $db = new mysqli($config['host'], $config['username'], $config['password'], $config['dbname']);

        $query = $db->query("SHOW TABLES");
        $tables = $query->fetch_all();

        $tableDefs = [];

        $records = [
          ['table-name', 'column-name']
        ];

        foreach ($tables as $table) {
            $tableName = current($table);
            $query = $db->query("DESCRIBE {$tableName}");
            if (!$query) {
                continue;
            }
            $columns = $query->fetch_all();
            foreach ($columns as $column) {
                $records[] = [$tableName, $column[0]];
            }
        }

        $output = fopen("php://output", 'w') or die("Can't open php://output");
        foreach ($records as $record) {
            fputcsv($output, $record);
        }
        fclose($output) or die("Can't close php://output");
    }
}
